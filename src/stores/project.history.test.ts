/**
 * @vitest-environment node
 */
import { type LyricLine, useProjectStore } from "@/stores/project";
import { beforeEach, describe, expect, it } from "vitest";

function seedLine(id: string, overrides: Partial<LyricLine> = {}): LyricLine {
  return { id, text: "hello world", agentId: "v1", ...overrides };
}

beforeEach(() => {
  useProjectStore.getState().reset();
  useProjectStore.getState().clearHistory();
});

// -- setLinesWithHistory and updateLinesWithHistory ----------------------------

describe("setLinesWithHistory", () => {
  it("pushes a history entry that undo restores", () => {
    useProjectStore.getState().setLines([seedLine("a"), seedLine("b")]);
    const before = useProjectStore.getState().lines;

    useProjectStore.getState().setLinesWithHistory([seedLine("a", { agentId: "v2" }), seedLine("b")]);
    expect(useProjectStore.getState().lines[0].agentId).toBe("v2");
    expect(useProjectStore.getState().canUndo()).toBe(true);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().lines).toEqual(before);
  });
});

describe("updateLinesWithHistory", () => {
  it("merges multiple line updates into one history step", () => {
    useProjectStore.getState().setLines([seedLine("a"), seedLine("b"), seedLine("c")]);

    useProjectStore.getState().updateLinesWithHistory([
      { id: "a", updates: { agentId: "v2" } },
      { id: "c", updates: { agentId: "v3" } },
    ]);

    expect(useProjectStore.getState().lines.map((l) => l.agentId)).toEqual(["v2", "v1", "v3"]);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().lines.map((l) => l.agentId)).toEqual(["v1", "v1", "v1"]);

    useProjectStore.getState().redo();
    expect(useProjectStore.getState().lines.map((l) => l.agentId)).toEqual(["v2", "v1", "v3"]);
  });

  it("clears words/begin/end via undefined updates and is undoable", () => {
    useProjectStore.getState().setLines([
      seedLine("a", {
        words: [{ text: "hi", begin: 0, end: 1 }],
        begin: 0,
        end: 1,
        backgroundWords: [{ text: "ah", begin: 0, end: 0.5 }],
        backgroundText: "ah",
      }),
    ]);

    useProjectStore.getState().updateLinesWithHistory([
      {
        id: "a",
        updates: { words: undefined, begin: undefined, end: undefined, backgroundWords: undefined },
      },
    ]);

    const cleared = useProjectStore.getState().lines[0];
    expect(cleared.words).toBeUndefined();
    expect(cleared.begin).toBeUndefined();
    expect(cleared.backgroundWords).toBeUndefined();

    useProjectStore.getState().undo();
    const restored = useProjectStore.getState().lines[0];
    expect(restored.words).toEqual([{ text: "hi", begin: 0, end: 1 }]);
    expect(restored.begin).toBe(0);
    expect(restored.backgroundWords).toEqual([{ text: "ah", begin: 0, end: 0.5 }]);
  });
});
