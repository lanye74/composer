import { describe, expect, it } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { createLine } from "@/test/factories";
import { syncStateOf } from "@/domain/project/sync-state";

function makeProject(lines: LibraryProject["lines"]): LibraryProject {
  return {
    version: 1,
    id: "id",
    metadata: { title: "t", artist: "a", album: "", duration: 0 },
    agents: [],
    lines,
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
  };
}

describe("syncStateOf", () => {
  it("returns 'empty' when there are no lines", () => {
    expect(syncStateOf(makeProject([]))).toBe("empty");
  });

  it("returns 'empty' when no line has timing", () => {
    const project = makeProject([createLine({ text: "hello" }), createLine({ text: "world" })]);
    expect(syncStateOf(project)).toBe("empty");
  });

  it("returns 'partial' when some lines have timing", () => {
    const project = makeProject([createLine({ text: "a", begin: 0, end: 1 }), createLine({ text: "b" })]);
    expect(syncStateOf(project)).toBe("partial");
  });

  it("returns 'synced' when every line has timing", () => {
    const project = makeProject([
      createLine({ text: "a", begin: 0, end: 1 }),
      createLine({ text: "b", begin: 1, end: 2 }),
    ]);
    expect(syncStateOf(project)).toBe("synced");
  });

  describe("edge cases", () => {
    it("treats word-synced lines as having timing", () => {
      const project = makeProject([
        createLine({
          text: "a b",
          words: [
            { text: "a", begin: 0, end: 0.5 },
            { text: "b", begin: 0.5, end: 1 },
          ],
        }),
      ]);
      expect(syncStateOf(project)).toBe("synced");
    });
  });
});
