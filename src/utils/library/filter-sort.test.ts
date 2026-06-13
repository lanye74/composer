import { describe, expect, it } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { createLine } from "@/test/factories";
import { filterProjects, sortProjects } from "@/utils/library/filter-sort";

// -- Helpers ------------------------------------------------------------------

function makeProject(overrides: Partial<LibraryProject> & Pick<LibraryProject, "id">): LibraryProject {
  return {
    version: 1,
    metadata: { title: "Title", artist: "Artist", album: "", duration: 100 },
    agents: [],
    lines: [],
    groups: [],
    granularity: "word",
    syllableSplitDefaults: { applyToAll: false, caseInsensitive: false },
    audioBytesCached: false,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    createdAt: 0,
    updatedAt: 0,
    lastOpenedAt: 0,
    ...overrides,
  };
}

const synced = makeProject({
  id: "synced",
  lines: [createLine({ text: "a", begin: 0, end: 1 })],
});
const partial = makeProject({
  id: "partial",
  lines: [createLine({ text: "a", begin: 0, end: 1 }), createLine({ text: "b" })],
});
const empty = makeProject({ id: "empty", lines: [createLine({ text: "a" })] });
const noLines = makeProject({ id: "no-lines", lines: [] });

// -- filterProjects -----------------------------------------------------------

describe("filterProjects", () => {
  it("returns all when chip is 'all'", () => {
    expect(filterProjects([synced, partial, empty, noLines], "all")).toHaveLength(4);
  });

  it("returns only synced projects when chip is 'synced'", () => {
    const filtered = filterProjects([synced, partial, empty, noLines], "synced");
    expect(filtered.map((p) => p.id)).toEqual(["synced"]);
  });

  it("returns only partial projects when chip is 'in-progress'", () => {
    const filtered = filterProjects([synced, partial, empty, noLines], "in-progress");
    expect(filtered.map((p) => p.id)).toEqual(["partial"]);
  });

  it("returns only empty projects when chip is 'empty'", () => {
    const filtered = filterProjects([synced, partial, empty, noLines], "empty");
    expect(filtered.map((p) => p.id)).toEqual(["empty", "no-lines"]);
  });

  describe("edge cases", () => {
    it("returns [] from an empty array", () => {
      expect(filterProjects([], "synced")).toEqual([]);
    });
  });
});

// -- sortProjects -------------------------------------------------------------

describe("sortProjects", () => {
  it("sorts by lastOpenedAt desc with pinned first for 'recent'", () => {
    const projects = [
      makeProject({ id: "a", lastOpenedAt: 100 }),
      makeProject({ id: "b", lastOpenedAt: 300 }),
      makeProject({ id: "c", lastOpenedAt: 200, pinned: true }),
    ];
    expect(sortProjects(projects, "recent").map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by createdAt desc with pinned first for 'created'", () => {
    const projects = [
      makeProject({ id: "a", createdAt: 100 }),
      makeProject({ id: "b", createdAt: 300 }),
      makeProject({ id: "c", createdAt: 200, pinned: true }),
    ];
    expect(sortProjects(projects, "created").map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by title locale-aware case-insensitive for 'title'", () => {
    const projects = [
      makeProject({ id: "a", metadata: { title: "banana", artist: "x", album: "", duration: 0 } }),
      makeProject({ id: "b", metadata: { title: "Apple", artist: "x", album: "", duration: 0 } }),
      makeProject({ id: "c", metadata: { title: "cherry", artist: "x", album: "", duration: 0 } }),
    ];
    expect(sortProjects(projects, "title").map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by artist locale-aware case-insensitive for 'artist'", () => {
    const projects = [
      makeProject({ id: "a", metadata: { title: "x", artist: "Zelda", album: "", duration: 0 } }),
      makeProject({ id: "b", metadata: { title: "x", artist: "alfred", album: "", duration: 0 } }),
      makeProject({ id: "c", metadata: { title: "x", artist: "Marie", album: "", duration: 0 } }),
    ];
    expect(sortProjects(projects, "artist").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by duration desc for 'duration'", () => {
    const projects = [
      makeProject({ id: "short", metadata: { title: "", artist: "", album: "", duration: 30 } }),
      makeProject({ id: "long", metadata: { title: "", artist: "", album: "", duration: 300 } }),
      makeProject({ id: "mid", metadata: { title: "", artist: "", album: "", duration: 120 } }),
    ];
    expect(sortProjects(projects, "duration").map((p) => p.id)).toEqual(["long", "mid", "short"]);
  });

  describe("edge cases", () => {
    it("returns [] from an empty array", () => {
      expect(sortProjects([], "title")).toEqual([]);
    });

    it("breaks title-equality ties by lastOpenedAt desc", () => {
      const projects = [
        makeProject({ id: "older", lastOpenedAt: 1, metadata: { title: "Same", artist: "", album: "", duration: 0 } }),
        makeProject({ id: "newer", lastOpenedAt: 2, metadata: { title: "Same", artist: "", album: "", duration: 0 } }),
      ];
      expect(sortProjects(projects, "title").map((p) => p.id)).toEqual(["newer", "older"]);
    });

    it("does not mutate the input array", () => {
      const projects = [makeProject({ id: "a", lastOpenedAt: 1 }), makeProject({ id: "b", lastOpenedAt: 2 })];
      const snapshot = projects.map((p) => p.id);
      sortProjects(projects, "recent");
      expect(projects.map((p) => p.id)).toEqual(snapshot);
    });
  });

  describe("invariants", () => {
    it("places pinned items first across every sort key", () => {
      const projects = [
        makeProject({ id: "u1", lastOpenedAt: 100 }),
        makeProject({ id: "p1", lastOpenedAt: 1, pinned: true }),
      ];
      for (const key of ["recent", "created", "title", "artist", "duration"] as const) {
        expect(sortProjects(projects, key)[0].id).toBe("p1");
      }
    });
  });
});
