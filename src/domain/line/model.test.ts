import { describe, expect, it } from "vitest";
import { reconcileLine } from "@/domain/line/model";
import type { LineFields, RomanizationData } from "@/domain/line/model";

describe("RomanizationData shape", () => {
  it("has text, wordTexts, source; no words field", () => {
    const data: RomanizationData = { text: "yoru dakedo", wordTexts: ["yoru", "dakedo"], source: "generated" };
    expect(data.text).toBe("yoru dakedo");
    expect(data.wordTexts).toEqual(["yoru", "dakedo"]);
    // @ts-expect-error v1 `words` field is gone.
    void data.words;
  });

  it("wordTexts is optional (line-level only romanization)", () => {
    const data: RomanizationData = { text: "yoru dakedo", source: "manual" };
    expect(data.wordTexts).toBeUndefined();
  });

  it("LineFields accepts romanization with wordTexts", () => {
    const line: LineFields = {
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      romanization: { text: "yoru dakedo", wordTexts: ["yoru", "dakedo"], source: "generated" },
    };
    expect(line.romanization?.wordTexts?.length).toBe(2);
  });
});

describe("reconcileLine - romanization", () => {
  it("preserves romanization on a word-synced line", () => {
    const reconciled = reconcileLine({
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
    expect(reconciled.romanization?.text).toBe("yoru dakedo");
    expect(reconciled.romanization?.source).toBe("generated");
    expect(reconciled.romanization?.wordTexts?.[0]).toBe("yoru");
  });

  it("preserves romanization on a line-synced line", () => {
    const reconciled = reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      begin: 0,
      end: 4,
      romanization: { text: "yoru dakedo", source: "manual" },
    });
    expect(reconciled.romanization?.text).toBe("yoru dakedo");
    expect(reconciled.romanization?.wordTexts).toBeUndefined();
  });

  it("preserves romanization on an untimed line", () => {
    const reconciled = reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      romanization: { text: "yoru dakedo", source: "manual" },
    });
    expect(reconciled.romanization?.source).toBe("manual");
  });

  it("allows romanization to be absent", () => {
    const reconciled = reconcileLine({ id: "L1", text: "hello", agentId: "v1" });
    expect(reconciled.romanization).toBeUndefined();
  });
});
