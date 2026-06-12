import { describe, expect, it } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import {
  deleteLibraryProject,
  getLibraryProject,
  listLibraryProjects,
  putLibraryProject,
} from "@/lib/library-persistence";

// The shared browser setup (src/test/setup-browser.ts) wipes the entire
// `ttml-composer` database before every test, so each test starts cold.

// -- Helpers ------------------------------------------------------------------

function makeProject(id: string, overrides: Partial<LibraryProject> = {}): LibraryProject {
  const now = Date.now();
  return {
    version: 1,
    id,
    metadata: { title: id, artist: "", album: "", duration: 0 },
    agents: [],
    lines: [],
    groups: [],
    granularity: "line",
    syllableSplitDefaults: { applyToAll: false, caseInsensitive: false },
    audioBytesCached: false,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    ...overrides,
  };
}

// -- Happy paths --------------------------------------------------------------

describe("library-persistence · happy paths", () => {
  it("put then get round-trips a project", async () => {
    await putLibraryProject(
      makeProject("p1", { metadata: { title: "Round Trip", artist: "X", album: "", duration: 90 } }),
    );
    const out = await getLibraryProject("p1");
    expect(out?.id).toBe("p1");
    expect(out?.metadata.title).toBe("Round Trip");
    expect(out?.metadata.artist).toBe("X");
  });

  it("list returns all stored projects sorted by lastOpenedAt desc", async () => {
    await putLibraryProject(makeProject("a", { lastOpenedAt: 100 }));
    await putLibraryProject(makeProject("b", { lastOpenedAt: 300 }));
    await putLibraryProject(makeProject("c", { lastOpenedAt: 200 }));
    const list = await listLibraryProjects();
    expect(list.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("delete removes the project", async () => {
    await putLibraryProject(makeProject("p1"));
    await deleteLibraryProject("p1");
    expect(await getLibraryProject("p1")).toBeUndefined();
  });
});

// -- Edge cases ---------------------------------------------------------------

describe("library-persistence · edge cases", () => {
  it("get on missing id returns undefined", async () => {
    expect(await getLibraryProject("nope")).toBeUndefined();
  });

  it("list on empty store returns []", async () => {
    expect(await listLibraryProjects()).toEqual([]);
  });

  it("put overwrites on same id", async () => {
    await putLibraryProject(makeProject("p1", { metadata: { title: "A", artist: "", album: "", duration: 0 } }));
    await putLibraryProject(makeProject("p1", { metadata: { title: "B", artist: "", album: "", duration: 0 } }));
    const out = await getLibraryProject("p1");
    expect(out?.metadata.title).toBe("B");
  });

  it("delete on missing id is a no-op", async () => {
    await expect(deleteLibraryProject("missing")).resolves.toBeUndefined();
  });

  it("put after delete re-adds the entry", async () => {
    await putLibraryProject(makeProject("p1", { metadata: { title: "first", artist: "", album: "", duration: 0 } }));
    await deleteLibraryProject("p1");
    await putLibraryProject(makeProject("p1", { metadata: { title: "second", artist: "", album: "", duration: 0 } }));
    expect((await getLibraryProject("p1"))?.metadata.title).toBe("second");
  });
});

// -- Invariants ---------------------------------------------------------------

describe("library-persistence · invariants", () => {
  it("pinned projects sort above unpinned regardless of lastOpenedAt", async () => {
    await putLibraryProject(makeProject("recent", { lastOpenedAt: 500, pinned: false }));
    await putLibraryProject(makeProject("old-pin", { lastOpenedAt: 100, pinned: true }));
    const list = await listLibraryProjects();
    expect(list[0].id).toBe("old-pin");
    expect(list[1].id).toBe("recent");
  });

  it("pinned projects are themselves sorted by lastOpenedAt desc", async () => {
    await putLibraryProject(makeProject("pin-old", { lastOpenedAt: 100, pinned: true }));
    await putLibraryProject(makeProject("pin-new", { lastOpenedAt: 400, pinned: true }));
    await putLibraryProject(makeProject("unpinned", { lastOpenedAt: 999, pinned: false }));
    const list = await listLibraryProjects();
    expect(list.map((p) => p.id)).toEqual(["pin-new", "pin-old", "unpinned"]);
  });

  it("overwriting a project does not duplicate it in list", async () => {
    await putLibraryProject(makeProject("p1", { lastOpenedAt: 100 }));
    await putLibraryProject(makeProject("p1", { lastOpenedAt: 200 }));
    const list = await listLibraryProjects();
    expect(list.map((p) => p.id)).toEqual(["p1"]);
    expect(list[0].lastOpenedAt).toBe(200);
  });
});
