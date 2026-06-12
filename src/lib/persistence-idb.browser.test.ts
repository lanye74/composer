import { describe, expect, it } from "vitest";
import {
  DB_VERSION,
  LIBRARY_PROJECTS_STORE,
  PROJECT_STORE_NAME,
  STEM_STORE_NAME,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  openDB,
  setInStore,
} from "@/lib/persistence-idb";

// The shared browser setup (src/test/setup-browser.ts) deletes the entire
// `ttml-composer` database before every test, so each test starts from a
// fresh cold-open of the schema.

// -- Schema -------------------------------------------------------------------

describe("persistence-idb · schema", () => {
  it("openDB returns a db at the expected version with all stores", async () => {
    const db = await openDB();
    expect(db.version).toBe(DB_VERSION);
    expect(db.objectStoreNames.contains(PROJECT_STORE_NAME)).toBe(true);
    expect(db.objectStoreNames.contains(STEM_STORE_NAME)).toBe(true);
    expect(db.objectStoreNames.contains(LIBRARY_PROJECTS_STORE)).toBe(true);
    db.close();
  });

  it("opening twice returns a db with identical schema (no spurious upgrade)", async () => {
    const first = await openDB();
    expect(first.version).toBe(DB_VERSION);
    first.close();
    const second = await openDB();
    expect(second.version).toBe(DB_VERSION);
    expect(second.objectStoreNames.contains(PROJECT_STORE_NAME)).toBe(true);
    expect(second.objectStoreNames.contains(STEM_STORE_NAME)).toBe(true);
    expect(second.objectStoreNames.contains(LIBRARY_PROJECTS_STORE)).toBe(true);
    second.close();
  });
});

// -- CRUD ---------------------------------------------------------------------

describe("persistence-idb · CRUD", () => {
  it("getFromStore returns undefined when key absent", async () => {
    const value = await getFromStore<string>(PROJECT_STORE_NAME, "missing-key");
    expect(value).toBeUndefined();
  });

  it("set + get round-trips primitive values", async () => {
    await setInStore<string>(PROJECT_STORE_NAME, "k", "hello");
    expect(await getFromStore<string>(PROJECT_STORE_NAME, "k")).toBe("hello");
  });

  it("set + get round-trips structured values", async () => {
    const value = { title: "Song", tags: ["a", "b"], nested: { count: 3 } };
    await setInStore(PROJECT_STORE_NAME, "k", value);
    expect(await getFromStore(PROJECT_STORE_NAME, "k")).toEqual(value);
  });

  it("set overwrites the previous value at the same key", async () => {
    await setInStore(PROJECT_STORE_NAME, "k", "first");
    await setInStore(PROJECT_STORE_NAME, "k", "second");
    expect(await getFromStore(PROJECT_STORE_NAME, "k")).toBe("second");
  });

  it("deleteFromStore removes a present key", async () => {
    await setInStore(PROJECT_STORE_NAME, "k", "v");
    await deleteFromStore(PROJECT_STORE_NAME, "k");
    expect(await getFromStore(PROJECT_STORE_NAME, "k")).toBeUndefined();
  });

  it("deleteFromStore on an absent key resolves without throwing", async () => {
    await expect(deleteFromStore(PROJECT_STORE_NAME, "never-set")).resolves.toBeUndefined();
  });
});

// -- Isolation between stores -------------------------------------------------

describe("persistence-idb · store isolation", () => {
  it("the same key in different stores resolves to independent values", async () => {
    await setInStore(PROJECT_STORE_NAME, "shared", "project-side");
    await setInStore(STEM_STORE_NAME, "shared", "stem-side");
    expect(await getFromStore(PROJECT_STORE_NAME, "shared")).toBe("project-side");
    expect(await getFromStore(STEM_STORE_NAME, "shared")).toBe("stem-side");
  });

  it("deleting from one store leaves the other store's value intact", async () => {
    await setInStore(PROJECT_STORE_NAME, "shared", "p");
    await setInStore(STEM_STORE_NAME, "shared", "s");
    await deleteFromStore(PROJECT_STORE_NAME, "shared");
    expect(await getFromStore(PROJECT_STORE_NAME, "shared")).toBeUndefined();
    expect(await getFromStore(STEM_STORE_NAME, "shared")).toBe("s");
  });
});

// -- getAllFromStore ----------------------------------------------------------

describe("persistence-idb · getAllFromStore", () => {
  it("returns [] when the store is empty", async () => {
    expect(await getAllFromStore<string>(PROJECT_STORE_NAME)).toEqual([]);
  });

  it("returns every value present in the store", async () => {
    await setInStore(PROJECT_STORE_NAME, "k1", "a");
    await setInStore(PROJECT_STORE_NAME, "k2", "b");
    await setInStore(PROJECT_STORE_NAME, "k3", "c");
    const all = await getAllFromStore<string>(PROJECT_STORE_NAME);
    expect(all.toSorted()).toEqual(["a", "b", "c"]);
  });

  it("does not include values from other stores", async () => {
    await setInStore(PROJECT_STORE_NAME, "k", "project");
    await setInStore(STEM_STORE_NAME, "k", "stem");
    const projectAll = await getAllFromStore<string>(PROJECT_STORE_NAME);
    expect(projectAll).toEqual(["project"]);
  });
});
