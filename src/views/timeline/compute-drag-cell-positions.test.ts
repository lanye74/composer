/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { reconcileLine, type LyricLine } from "@/domain/line/model";
import type { WordSelection } from "@/domain/selection/model";
import { computeDragCellPositions } from "@/views/timeline/compute-drag-cell-positions";
import { ROMAJI_BAND_HEIGHT } from "@/views/timeline/get-effective-line-main-height";

// -- Constants ----------------------------------------------------------------

const DEFAULT_ROW_HEIGHT = 44;
const BG_DROP_ZONE_HEIGHT = 24;
const GROUP_HEADER_HEIGHT = 26;
const WAVEFORM_HEIGHT = 80;
const ZOOM = 100;

// -- Fixtures -----------------------------------------------------------------

function plainLine(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "Hello world",
    agentId: "v1",
    words: [
      { text: "Hello ", begin: 0, end: 0.5 },
      { text: "world", begin: 0.5, end: 1 },
    ],
  });
}

function romanizedLine(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "夜だけど",
    agentId: "v1",
    words: [
      { text: "夜", begin: 0, end: 0.5 },
      { text: "だけど", begin: 0.5, end: 1 },
    ],
    romanization: { text: "yoru dakedo", source: "generated" },
  });
}

function romanizedLineWithBg(id: string): LyricLine {
  return reconcileLine({
    id,
    text: "夜だけど",
    agentId: "v1",
    words: [{ text: "夜だけど", begin: 0, end: 1 }],
    backgroundWords: [{ text: "echo", begin: 0, end: 1 }],
    romanization: { text: "yoru dakedo", source: "generated" },
  });
}

function defaultLayoutInputs(lines: LyricLine[]) {
  return {
    lines,
    rowHeights: {} as Record<string, number>,
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    collapsedInstances: {} as Record<string, boolean>,
    waveformHeight: WAVEFORM_HEIGHT,
    bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
    groupHeaderHeight: GROUP_HEADER_HEIGHT,
  };
}

// -- Tests --------------------------------------------------------------------

describe("computeDragCellPositions · cell-height chokepoint", () => {
  it("anchorHeight on a plain main-track drag equals base minus padding", () => {
    const lines = [plainLine("L1")];
    const activeDrag = {
      lineId: "L1",
      lineIndex: 0,
      wordIndex: 0,
      trackType: "word" as const,
      begin: 0,
      end: 0.5,
      text: "Hello",
    };
    const result = computeDragCellPositions({
      activeDrag,
      effectiveLines: lines,
      selectedWords: [] as WordSelection[],
      layoutInputs: defaultLayoutInputs(lines),
      zoom: ZOOM,
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.anchorHeight).toBe(DEFAULT_ROW_HEIGHT - 8);
  });

  it("anchorHeight on a romanized main-track drag includes the romaji band", () => {
    const lines = [romanizedLine("L1")];
    const activeDrag = {
      lineId: "L1",
      lineIndex: 0,
      wordIndex: 0,
      trackType: "word" as const,
      begin: 0,
      end: 0.5,
      text: "夜",
    };
    const result = computeDragCellPositions({
      activeDrag,
      effectiveLines: lines,
      selectedWords: [] as WordSelection[],
      layoutInputs: defaultLayoutInputs(lines),
      zoom: ZOOM,
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.anchorHeight).toBe(DEFAULT_ROW_HEIGHT + ROMAJI_BAND_HEIGHT - 8);
  });

  it("bg-track anchorTop on a romanized line lands at top + main + romaji band, not top + base", () => {
    const lines = [romanizedLineWithBg("L1")];
    const activeDrag = {
      lineId: "L1",
      lineIndex: 0,
      wordIndex: 0,
      trackType: "bg" as const,
      begin: 0,
      end: 0.5,
      text: "echo",
    };
    const result = computeDragCellPositions({
      activeDrag,
      effectiveLines: lines,
      selectedWords: [] as WordSelection[],
      layoutInputs: defaultLayoutInputs(lines),
      zoom: ZOOM,
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.anchorTop).toBe(WAVEFORM_HEIGHT + DEFAULT_ROW_HEIGHT + ROMAJI_BAND_HEIGHT);
  });

  it("multi-cell drag spanning a romanized line places cells at the correct main vs bg vertical offsets", () => {
    const lines = [romanizedLineWithBg("L1")];
    const activeDrag = {
      lineId: "L1",
      lineIndex: 0,
      wordIndex: 0,
      trackType: "word" as const,
      begin: 0,
      end: 1,
      text: "夜だけど",
    };
    const selectedWords: WordSelection[] = [
      { lineId: "L1", lineIndex: 0, wordIndex: 0, type: "word" },
      { lineId: "L1", lineIndex: 0, wordIndex: 0, type: "bg" },
    ];
    const result = computeDragCellPositions({
      activeDrag,
      effectiveLines: lines,
      selectedWords,
      layoutInputs: defaultLayoutInputs(lines),
      zoom: ZOOM,
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.cells).toHaveLength(2);

    const mainCell = result.cells.find((c) => c.text === "夜だけど");
    const bgCell = result.cells.find((c) => c.text === "echo");
    expect(mainCell).toBeDefined();
    expect(bgCell).toBeDefined();
    if (!mainCell || !bgCell) return;

    expect(mainCell.top).toBe(0);
    expect(bgCell.top).toBe(DEFAULT_ROW_HEIGHT + ROMAJI_BAND_HEIGHT);
  });

  it("uses pos.mainHeight from the layout (not raw rowHeights map)", () => {
    const lines = [romanizedLine("L1")];
    const activeDrag = {
      lineId: "L1",
      lineIndex: 0,
      wordIndex: 0,
      trackType: "word" as const,
      begin: 0,
      end: 0.5,
      text: "夜",
    };
    const result = computeDragCellPositions({
      activeDrag,
      effectiveLines: lines,
      selectedWords: [] as WordSelection[],
      layoutInputs: { ...defaultLayoutInputs(lines), rowHeights: { L1: 80 } },
      zoom: ZOOM,
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.anchorHeight).toBe(80 + ROMAJI_BAND_HEIGHT - 8);
  });

  it("returns null when no active drag is given", () => {
    const lines = [plainLine("L1")];
    const result = computeDragCellPositions({
      activeDrag: null,
      effectiveLines: lines,
      selectedWords: [] as WordSelection[],
      layoutInputs: defaultLayoutInputs(lines),
      zoom: ZOOM,
    });
    expect(result).toBeNull();
  });
});
