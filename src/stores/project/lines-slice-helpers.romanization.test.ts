import { describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project";
import { createLine } from "@/test/factories";

const DURATION = 30;

describe("lines-slice-helpers · writeFieldWords via mergeSyllableGroupIntoWord", () => {
  it("truncates wordTexts when main-track words shrink via syllable-group merge", () => {
    const groupId = "g1";
    useProjectStore.getState().reset();
    useProjectStore.getState().setLines([
      createLine({
        id: "L1",
        words: [
          { text: "run", begin: 0, end: 0.5, syllableGroupId: groupId },
          { text: "ning ", begin: 0.5, end: 1, syllableGroupId: groupId },
          { text: "fast", begin: 1, end: 2 },
        ],
        romanization: {
          text: "RUN NING FAST",
          wordTexts: ["RUN", "NING", "FAST"],
          source: "manual",
        },
      }),
    ]);

    useProjectStore.getState().mergeSyllableGroupIntoWord("L1", "words", [0, 1]);

    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toHaveLength(2);
    expect(line?.romanization?.wordTexts).toHaveLength(2);
    expect(line?.romanization?.wordTexts).toEqual(["RUN", "NING"]);
  });

  it("does not touch main romanization when bg syllable-group is merged", () => {
    const groupId = "g1";
    useProjectStore.getState().reset();
    useProjectStore.getState().setLines([
      createLine({
        id: "L1",
        words: [
          { text: "main ", begin: 0, end: 1 },
          { text: "track", begin: 1, end: 2 },
        ],
        backgroundWords: [
          { text: "run", begin: 5, end: 5.5, syllableGroupId: groupId },
          { text: "ning", begin: 5.5, end: 6, syllableGroupId: groupId },
        ],
        backgroundText: "running",
        romanization: {
          text: "MAIN TRACK",
          wordTexts: ["MAIN", "TRACK"],
          source: "manual",
        },
      }),
    ]);

    useProjectStore.getState().mergeSyllableGroupIntoWord("L1", "backgroundWords", [0, 1]);

    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.backgroundWords).toHaveLength(1);
    expect(line?.words).toHaveLength(2);
    expect(line?.romanization?.wordTexts).toEqual(["MAIN", "TRACK"]);
  });
});

describe("lines-slice-helpers · applyMoveToBg romanization alignment", () => {
  it("truncates wordTexts when a word is moved out of main into bg", () => {
    useProjectStore.getState().reset();
    useProjectStore.getState().setLines([
      createLine({
        id: "L1",
        words: [
          { text: "hello ", begin: 0, end: 1 },
          { text: "world ", begin: 1, end: 2 },
          { text: "goodbye", begin: 2, end: 3 },
        ],
        romanization: {
          text: "HELLO WORLD GOODBYE",
          wordTexts: ["HELLO", "WORLD", "GOODBYE"],
          source: "manual",
        },
      }),
    ]);

    useProjectStore.getState().moveWordToBg("L1", [2], 0, DURATION);

    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toHaveLength(2);
    expect(line?.romanization?.wordTexts).toEqual(["HELLO", "WORLD"]);
  });

  it("drops wordTexts when all main words are moved into bg", () => {
    useProjectStore.getState().reset();
    useProjectStore.getState().setLines([
      createLine({
        id: "L1",
        words: [{ text: "only", begin: 0, end: 1 }],
        romanization: { text: "ONLY", wordTexts: ["ONLY"], source: "manual" },
      }),
    ]);

    useProjectStore.getState().moveWordToBg("L1", [0], 0, DURATION);

    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toEqual([]);
    expect(line?.romanization?.text).toBe("ONLY");
    expect(line?.romanization?.wordTexts).toBeUndefined();
  });
});

describe("lines-slice-helpers · applyMoveFromBg romanization alignment", () => {
  it("pads wordTexts when a word is moved from bg into main", () => {
    useProjectStore.getState().reset();
    useProjectStore.getState().setLines([
      createLine({
        id: "L1",
        words: [
          { text: "hello ", begin: 0, end: 1 },
          { text: "world", begin: 1, end: 2 },
        ],
        backgroundWords: [{ text: "ooh", begin: 5, end: 6 }],
        backgroundText: "ooh",
        romanization: { text: "HELLO WORLD", wordTexts: ["HELLO", "WORLD"], source: "manual" },
      }),
    ]);

    useProjectStore.getState().moveWordFromBg("L1", [0], 0, DURATION);

    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toHaveLength(3);
    expect(line?.romanization?.wordTexts).toEqual(["HELLO", "WORLD", ""]);
  });

  it("leaves wordTexts absent when romanization is line-level only and main grows", () => {
    useProjectStore.getState().reset();
    useProjectStore.getState().setLines([
      createLine({
        id: "L1",
        words: [
          { text: "hello ", begin: 0, end: 1 },
          { text: "world", begin: 1, end: 2 },
        ],
        backgroundWords: [{ text: "ooh", begin: 5, end: 6 }],
        backgroundText: "ooh",
        romanization: { text: "HELLO WORLD", source: "manual" },
      }),
    ]);

    useProjectStore.getState().moveWordFromBg("L1", [0], 0, DURATION);

    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toHaveLength(3);
    expect(line?.romanization?.text).toBe("HELLO WORLD");
    expect(line?.romanization?.wordTexts).toBeUndefined();
  });
});
