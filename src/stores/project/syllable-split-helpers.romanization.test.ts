import { describe, expect, it } from "vitest";
import { applySyllableSplitToLines } from "@/stores/project/syllable-split-helpers";
import { createLine } from "@/test/factories";

describe("applySyllableSplitToLines · romanization alignment", () => {
  it("pads wordTexts with empty string when split grows words from 2 to 3", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [
          { text: "running ", begin: 0, end: 1 },
          { text: "fast", begin: 1, end: 2 },
        ],
        romanization: {
          text: "running fast",
          wordTexts: ["running", "fast"],
          source: "manual",
        },
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 0, type: "word" }, [3], false);

    expect(result[0].words).toHaveLength(3);
    expect(result[0].romanization).toBeDefined();
    expect(result[0].romanization?.wordTexts).toHaveLength(3);
    expect(result[0].romanization?.wordTexts?.[0]).toBe("running");
    expect(result[0].romanization?.wordTexts?.[1]).toBe("fast");
    expect(result[0].romanization?.wordTexts?.[2]).toBe("");
    expect(result[0].romanization?.text).toBe("running fast");
    expect(result[0].romanization?.source).toBe("manual");
  });

  it("leaves romanization absent when the line had none", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [{ text: "running", begin: 0, end: 1 }],
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 0, type: "word" }, [3], false);

    expect(result[0].words).toHaveLength(2);
    expect(result[0].romanization).toBeUndefined();
  });

  it("leaves wordTexts absent when romanization is line-level only (no wordTexts)", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [{ text: "running", begin: 0, end: 1 }],
        romanization: { text: "running", source: "manual" },
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 0, type: "word" }, [3], false);

    expect(result[0].words).toHaveLength(2);
    expect(result[0].romanization?.text).toBe("running");
    expect(result[0].romanization?.wordTexts).toBeUndefined();
    expect(result[0].romanization?.source).toBe("manual");
  });

  it("pads wordTexts when splitting grows words from 3 to 4", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [
          { text: "one ", begin: 0, end: 1 },
          { text: "running ", begin: 1, end: 2 },
          { text: "three", begin: 2, end: 3 },
        ],
        romanization: {
          text: "one running three",
          wordTexts: ["one", "running", "three"],
          source: "generated",
        },
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 1, type: "word" }, [3], false);

    expect(result[0].words).toHaveLength(4);
    expect(result[0].romanization?.wordTexts).toHaveLength(4);
    expect(result[0].romanization?.wordTexts).toEqual(["one", "running", "three", ""]);
  });

  it("preserves the first-word romaji when the first word is the split target", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [
          { text: "running ", begin: 0, end: 1 },
          { text: "fast", begin: 1, end: 2 },
        ],
        romanization: {
          text: "RUN FAST",
          wordTexts: ["RUN", "FAST"],
          source: "manual",
        },
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 0, type: "word" }, [3], false);

    expect(result[0].words).toHaveLength(3);
    expect(result[0].romanization?.wordTexts?.[0]).toBe("RUN");
    expect(result[0].romanization?.wordTexts?.[1]).toBe("FAST");
    expect(result[0].romanization?.wordTexts?.[2]).toBe("");
  });

  it("aligns to final word count when multiple targets split on the same line", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [
          { text: "go ", begin: 0, end: 1 },
          { text: "stop ", begin: 1, end: 2 },
          { text: "go", begin: 2, end: 3 },
        ],
        romanization: {
          text: "GO STOP GO",
          wordTexts: ["GO", "STOP", "GO"],
          source: "manual",
        },
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 0, type: "word" }, [1], false);

    expect(result[0].words?.map((w) => w.text)).toEqual(["g", "o ", "stop ", "g", "o"]);
    expect(result[0].romanization?.wordTexts).toHaveLength(5);
    expect(result[0].romanization?.wordTexts).toEqual(["GO", "STOP", "GO", "", ""]);
  });

  it("does not touch romanization when only the background track is split", () => {
    const lines = [
      createLine({
        id: "l1",
        words: [{ text: "main", begin: 0, end: 1 }],
        backgroundText: "running",
        backgroundWords: [{ text: "running", begin: 1, end: 2 }],
        romanization: {
          text: "main",
          wordTexts: ["main"],
          source: "manual",
        },
      }),
    ];

    const result = applySyllableSplitToLines(lines, { lineId: "l1", wordIndex: 0, type: "bg" }, [3], false);

    expect(result[0].backgroundWords).toHaveLength(2);
    expect(result[0].words).toHaveLength(1);
    expect(result[0].romanization?.wordTexts).toEqual(["main"]);
  });
});
