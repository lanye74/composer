import { beforeEach, describe, expect, it } from "vitest";
import { reconcileLine, type LooseLine, type LyricLine } from "@/domain/line/model";
import { INITIAL_STATE, useProjectStore } from "@/stores/project";

const seedRomanizedLine = (overrides: Partial<LooseLine> = {}): LyricLine =>
  reconcileLine({
    id: "L1",
    text: "夜 だけど",
    agentId: "v1",
    words: [
      { text: "夜", begin: 0, end: 1 },
      { text: "だけど", begin: 1, end: 2 },
    ],
    romanization: { text: "yoru dakedo", wordTexts: ["yoru", "dakedo"], source: "generated" },
    ...overrides,
  });

beforeEach(() => {
  useProjectStore.setState(INITIAL_STATE);
});

describe("Phase A: wordTexts preservation across word-count-changing mutators", () => {
  it("updateLine that grows line.words count pads wordTexts with empty strings", () => {
    useProjectStore.getState().setLines([seedRomanizedLine()]);
    useProjectStore.getState().updateLine("L1", {
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だ", begin: 1, end: 1.5 },
        { text: "けど", begin: 1.5, end: 2 },
      ],
    });
    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.romanization?.wordTexts).toEqual(["yoru", "dakedo", ""]);
    expect(line?.romanization?.text).toBe("yoru dakedo");
    expect(line?.romanization?.source).toBe("generated");
  });

  it("updateLine that shrinks line.words count truncates wordTexts", () => {
    useProjectStore.getState().setLines([seedRomanizedLine()]);
    useProjectStore.getState().updateLine("L1", {
      words: [{ text: "夜だけど", begin: 0, end: 2 }],
    });
    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.romanization?.wordTexts).toEqual(["yoru"]);
    expect(line?.romanization?.text).toBe("yoru dakedo");
  });

  it("updateLine that does NOT change word count preserves wordTexts identity", () => {
    useProjectStore.getState().setLines([seedRomanizedLine()]);
    const before = useProjectStore.getState().lines.find((l) => l.id === "L1")?.romanization?.wordTexts;
    useProjectStore.getState().updateLine("L1", {
      words: [
        { text: "夜", begin: 0.1, end: 1 },
        { text: "だけど", begin: 1, end: 2 },
      ],
    });
    const after = useProjectStore.getState().lines.find((l) => l.id === "L1")?.romanization?.wordTexts;
    expect(after).toEqual(["yoru", "dakedo"]);
    expect(after).toBe(before);
  });

  it("updateLineWithHistory pads wordTexts when source line.words count grows", () => {
    useProjectStore.getState().setLines([seedRomanizedLine()]);
    useProjectStore.getState().updateLineWithHistory("L1", {
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だ", begin: 1, end: 1.5 },
        { text: "けど", begin: 1.5, end: 2 },
      ],
    });
    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.romanization?.wordTexts).toEqual(["yoru", "dakedo", ""]);
  });

  it("updateLineWithHistory truncates wordTexts when source line.words count shrinks", () => {
    useProjectStore.getState().setLines([seedRomanizedLine()]);
    useProjectStore.getState().updateLineWithHistory("L1", {
      words: [{ text: "夜だけど", begin: 0, end: 2 }],
    });
    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.romanization?.wordTexts).toEqual(["yoru"]);
  });

  it("smart-sync sibling propagation pads sibling wordTexts when source grows", () => {
    useProjectStore.getState().setGroups([{ id: "g1", label: "Group 1", color: "#000", templateVersion: 1 }]);
    useProjectStore.getState().setLines([
      seedRomanizedLine({ id: "L1", groupId: "g1", instanceIdx: 0, templateLineIdx: 0 }),
      seedRomanizedLine({
        id: "L2",
        groupId: "g1",
        instanceIdx: 1,
        templateLineIdx: 0,
        words: [
          { text: "夜", begin: 10, end: 11 },
          { text: "だけど", begin: 11, end: 12 },
        ],
        romanization: { text: "YORU DAKEDO", wordTexts: ["YORU", "DAKEDO"], source: "manual" },
      }),
    ]);

    useProjectStore.getState().updateLineWithHistory("L1", {
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だ", begin: 1, end: 1.5 },
        { text: "けど", begin: 1.5, end: 2 },
      ],
    });

    const sibling = useProjectStore.getState().lines.find((l) => l.id === "L2");
    expect(sibling?.words).toHaveLength(3);
    expect(sibling?.romanization?.wordTexts).toEqual(["YORU", "DAKEDO", ""]);
    expect(sibling?.romanization?.text).toBe("YORU DAKEDO");
    expect(sibling?.romanization?.source).toBe("manual");
  });

  it("applyWordCountChange (apply branch) pads wordTexts when source grows", () => {
    useProjectStore.getState().setLines([seedRomanizedLine()]);
    useProjectStore.getState().applyWordCountChange(
      "L1",
      [
        { text: "夜", begin: 0, end: 1 },
        { text: "だ", begin: 1, end: 1.5 },
        { text: "けど", begin: 1.5, end: 2 },
      ],
      "words",
      "apply",
    );
    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toHaveLength(3);
    expect(line?.romanization?.wordTexts).toEqual(["yoru", "dakedo", ""]);
  });

  it("applyWordCountChange (detach branch) pads wordTexts when source grows", () => {
    useProjectStore.getState().setGroups([{ id: "g1", label: "Group 1", color: "#000", templateVersion: 1 }]);
    useProjectStore.getState().setLines([seedRomanizedLine({ groupId: "g1", instanceIdx: 0, templateLineIdx: 0 })]);
    useProjectStore.getState().applyWordCountChange(
      "L1",
      [
        { text: "夜", begin: 0, end: 1 },
        { text: "だ", begin: 1, end: 1.5 },
        { text: "けど", begin: 1.5, end: 2 },
      ],
      "words",
      "detach",
    );
    const line = useProjectStore.getState().lines.find((l) => l.id === "L1");
    expect(line?.words).toHaveLength(3);
    expect(line?.groupId).toBeUndefined();
    expect(line?.romanization?.wordTexts).toEqual(["yoru", "dakedo", ""]);
  });
});
