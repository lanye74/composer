import { describe, expect, it } from "vitest";
import type { LyricLine } from "@/domain/line/model";
import { getEffectiveLineMainHeight, ROMAJI_BAND_HEIGHT } from "@/views/timeline/get-effective-line-main-height";

// -- Fixtures -----------------------------------------------------------------

const lineWithoutRomanization: LyricLine = {
  id: "l1",
  text: "Hello",
  agentId: "v1",
  words: [{ text: "Hello", begin: 0, end: 1 }],
};

const lineWithRomanization: LyricLine = {
  id: "l2",
  text: "夜だけど",
  agentId: "v1",
  words: [{ text: "夜だけど", begin: 0, end: 1 }],
  romanization: { text: "yoru dakedo", source: "generated" },
};

// -- Tests --------------------------------------------------------------------

describe("getEffectiveLineMainHeight", () => {
  it("returns the base unchanged when the line has no romanization", () => {
    expect(getEffectiveLineMainHeight(lineWithoutRomanization, 44)).toBe(44);
  });

  it("adds ROMAJI_BAND_HEIGHT to the base when the line has romanization", () => {
    expect(getEffectiveLineMainHeight(lineWithRomanization, 44)).toBe(44 + ROMAJI_BAND_HEIGHT);
  });

  it("returns the base when romanization is present but empty text", () => {
    const line: LyricLine = {
      ...lineWithRomanization,
      romanization: { text: "", source: "manual" },
    };
    expect(getEffectiveLineMainHeight(line, 44)).toBe(44);
  });

  it("counts whitespace-only romanization as present (defers to hasRomanization predicate)", () => {
    const line: LyricLine = {
      ...lineWithRomanization,
      romanization: { text: "   ", source: "generated" },
    };
    expect(getEffectiveLineMainHeight(line, 44)).toBe(44 + ROMAJI_BAND_HEIGHT);
  });

  it("treats a base of zero correctly", () => {
    expect(getEffectiveLineMainHeight(lineWithoutRomanization, 0)).toBe(0);
    expect(getEffectiveLineMainHeight(lineWithRomanization, 0)).toBe(ROMAJI_BAND_HEIGHT);
  });

  it("never returns a negative result", () => {
    expect(getEffectiveLineMainHeight(lineWithoutRomanization, -10)).toBeGreaterThanOrEqual(0);
    expect(getEffectiveLineMainHeight(lineWithRomanization, -10)).toBeGreaterThanOrEqual(0);
  });

  it("preserves the base value at high heights (resize handle clamp)", () => {
    expect(getEffectiveLineMainHeight(lineWithoutRomanization, 120)).toBe(120);
    expect(getEffectiveLineMainHeight(lineWithRomanization, 120)).toBe(120 + ROMAJI_BAND_HEIGHT);
  });

  it("ROMAJI_BAND_HEIGHT is a positive integer above 12px (room for text-xs)", () => {
    expect(Number.isInteger(ROMAJI_BAND_HEIGHT)).toBe(true);
    expect(ROMAJI_BAND_HEIGHT).toBeGreaterThanOrEqual(12);
  });
});
