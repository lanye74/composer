/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { reconcileLine, type LyricLine } from "@/domain/line/model";
import { computeLineRowHeights } from "@/views/timeline/compute-line-row-heights";
import { ROMAJI_BAND_HEIGHT } from "@/views/timeline/get-effective-line-main-height";

// -- Constants ----------------------------------------------------------------

const DEFAULT_ROW_HEIGHT = 44;
const BG_DROP_ZONE_HEIGHT = 24;

// -- Fixtures -----------------------------------------------------------------

function plainLine(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "Hello",
    agentId: "v1",
    words: [{ text: "Hello", begin: 0, end: 1 }],
  });
}

function romanizedLine(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "夜",
    agentId: "v1",
    words: [{ text: "夜", begin: 0, end: 1 }],
    romanization: { text: "yoru", source: "generated" },
  });
}

function lineWithBg(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "Hello",
    agentId: "v1",
    words: [{ text: "Hello", begin: 0, end: 1 }],
    backgroundWords: [{ text: "ah", begin: 0, end: 1 }],
  });
}

function romanizedLineWithBg(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "夜",
    agentId: "v1",
    words: [{ text: "夜", begin: 0, end: 1 }],
    backgroundWords: [{ text: "ah", begin: 0, end: 1 }],
    romanization: { text: "yoru", source: "generated" },
  });
}

// -- Tests --------------------------------------------------------------------

describe("computeLineRowHeights · single source of truth", () => {
  it("plain line yields baseHeight main + drop-zone bg + 1px", () => {
    const result = computeLineRowHeights({
      line: plainLine("L1"),
      baseHeight: DEFAULT_ROW_HEIGHT,
      bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
    });
    expect(result.mainHeight).toBe(DEFAULT_ROW_HEIGHT);
    expect(result.bgHeight).toBe(BG_DROP_ZONE_HEIGHT);
    expect(result.totalHeight).toBe(DEFAULT_ROW_HEIGHT + BG_DROP_ZONE_HEIGHT + 1);
  });

  it("romanized line adds ROMAJI_BAND_HEIGHT to mainHeight only", () => {
    const result = computeLineRowHeights({
      line: romanizedLine("L1"),
      baseHeight: DEFAULT_ROW_HEIGHT,
      bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
    });
    expect(result.mainHeight).toBe(DEFAULT_ROW_HEIGHT + ROMAJI_BAND_HEIGHT);
    expect(result.bgHeight).toBe(BG_DROP_ZONE_HEIGHT);
    expect(result.totalHeight).toBe(DEFAULT_ROW_HEIGHT + ROMAJI_BAND_HEIGHT + BG_DROP_ZONE_HEIGHT + 1);
  });

  it("line with bg words uses baseHeight (not drop zone) for bg track", () => {
    const result = computeLineRowHeights({
      line: lineWithBg("L1"),
      baseHeight: DEFAULT_ROW_HEIGHT,
      bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
    });
    expect(result.mainHeight).toBe(DEFAULT_ROW_HEIGHT);
    expect(result.bgHeight).toBe(DEFAULT_ROW_HEIGHT);
    expect(result.totalHeight).toBe(DEFAULT_ROW_HEIGHT * 2 + 1);
  });

  it("romanized line with bg adds the romaji band to main only, not bg", () => {
    const result = computeLineRowHeights({
      line: romanizedLineWithBg("L1"),
      baseHeight: DEFAULT_ROW_HEIGHT,
      bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
    });
    expect(result.mainHeight).toBe(DEFAULT_ROW_HEIGHT + ROMAJI_BAND_HEIGHT);
    expect(result.bgHeight).toBe(DEFAULT_ROW_HEIGHT);
    expect(result.totalHeight).toBe(DEFAULT_ROW_HEIGHT * 2 + ROMAJI_BAND_HEIGHT + 1);
  });
});
