import { describe, expect, it } from "vitest";
import { reconcileLine } from "@/domain/line/model";

describe("reconcileLine + romanization", () => {
  it("preserves romanization on a word-synced line when arity matches", () => {
    const line = reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だけど", begin: 1, end: 2 },
      ],
      romanization: {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "generated",
        engine: "cutlet",
      },
    });
    expect(line.romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
    expect(line.romanization?.engine).toBe("cutlet");
  });

  it("drops wordTexts when arity mismatches line.words", () => {
    const line = reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      words: [{ text: "夜", begin: 0, end: 1 }],
      romanization: {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "generated",
      },
    });
    expect(line.romanization?.text).toBe("yoru dakedo");
    expect(line.romanization?.wordTexts).toBeUndefined();
  });

  it("drops wordTexts on a line-synced line that has no words", () => {
    const line = reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      begin: 0,
      end: 2,
      romanization: {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "manual",
      },
    });
    expect(line.romanization?.text).toBe("yoru dakedo");
    expect(line.romanization?.wordTexts).toBeUndefined();
  });

  it("drops wordTexts on an untimed line", () => {
    const line = reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      romanization: {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "manual",
      },
    });
    expect(line.romanization?.text).toBe("yoru dakedo");
    expect(line.romanization?.wordTexts).toBeUndefined();
  });

  it("keeps wordTexts when zero words and zero wordTexts (degenerate but valid)", () => {
    const line = reconcileLine({
      id: "L1",
      text: "",
      agentId: "v1",
      words: [],
      romanization: { text: "", wordTexts: [], source: "manual" },
    });
    expect(line.romanization?.wordTexts).toEqual([]);
  });

  it("treats romanization as absent when not provided", () => {
    const line = reconcileLine({
      id: "L1",
      text: "hi",
      agentId: "v1",
      words: [{ text: "hi", begin: 0, end: 1 }],
    });
    expect(line.romanization).toBeUndefined();
  });

  it("preserves source=manual on a line-synced line with no wordTexts", () => {
    const line = reconcileLine({
      id: "L1",
      text: "夜",
      agentId: "v1",
      begin: 0,
      end: 1,
      romanization: { text: "yoru", source: "manual" },
    });
    expect(line.romanization).toEqual({ text: "yoru", source: "manual" });
  });

  it("strips wordTexts but keeps text immutable (no clone leak)", () => {
    const wordTexts = ["yoru", "dakedo"];
    const line = reconcileLine({
      id: "L1",
      text: "x",
      agentId: "v1",
      words: [{ text: "x", begin: 0, end: 1 }],
      romanization: { text: "yoru dakedo", wordTexts, source: "manual" },
    });
    expect(line.romanization?.wordTexts).toBeUndefined();
    expect(wordTexts).toEqual(["yoru", "dakedo"]);
  });
});
