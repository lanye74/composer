import type { DragEndEvent } from "@dnd-kit/core";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { createLine, createWord } from "@/test/factories";
import { computeDragCellPositions } from "@/views/timeline/compute-drag-cell-positions";
import { ROMAJI_BAND_HEIGHT } from "@/views/timeline/get-effective-line-main-height";
import { useTimelineStore, WAVEFORM_HEIGHT } from "@/views/timeline/timeline-store";
import { useTimelineDnd } from "@/views/timeline/use-timeline-dnd";

// -- Constants ----------------------------------------------------------------

const BG_DROP_ZONE_HEIGHT = 24;
const GROUP_HEADER_HEIGHT = 26;
const ZOOM = 100;

// -- Helpers ------------------------------------------------------------------

function seedTwoLineProject(): { romanizedId: string; plainId: string } {
  useAudioStore.setState({ duration: 30 });
  useTimelineStore.setState({ zoom: ZOOM });
  const romanizedId = "L-romanized";
  const plainId = "L-plain";
  useProjectStore.setState({
    lines: [
      createLine({
        id: romanizedId,
        text: "夜だけど",
        words: [createWord({ text: "夜 ", begin: 0, end: 1 }), createWord({ text: "だけど", begin: 1, end: 2 })],
        romanization: {
          text: "yoru dakedo",
          source: "generated",
          wordTexts: ["yoru", "dakedo"],
        },
      }),
      createLine({
        id: plainId,
        text: "hello world",
        words: [createWord({ text: "hello ", begin: 3, end: 4 }), createWord({ text: "world", begin: 4, end: 5 })],
      }),
    ],
  });
  return { romanizedId, plainId };
}

function makeSameLineMainDragEnd(
  lineId: string,
  lineIndex: number,
  wordIndex: number,
  text: string,
  begin: number,
  end: number,
  deltaX: number,
  deltaY: number,
): DragEndEvent {
  return {
    active: {
      id: `word-${wordIndex}`,
      data: {
        current: { lineId, lineIndex, wordIndex, trackType: "word", text, begin, end },
      },
      rect: { current: { initial: null, translated: null } },
    },
    over: {
      id: `main-drop-${lineId}`,
      data: { current: { lineId } },
      rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
      disabled: false,
    },
    delta: { x: deltaX, y: deltaY },
    activatorEvent: new PointerEvent("pointerdown", { shiftKey: false }),
    collisions: null,
  } as unknown as DragEndEvent;
}

function makeMainToBgDragEnd(
  lineId: string,
  lineIndex: number,
  wordIndex: number,
  text: string,
  begin: number,
  end: number,
  deltaX: number,
  deltaY: number,
): DragEndEvent {
  return {
    active: {
      id: `word-${wordIndex}`,
      data: {
        current: { lineId, lineIndex, wordIndex, trackType: "word", text, begin, end },
      },
      rect: { current: { initial: null, translated: null } },
    },
    over: {
      id: `bg-drop-${lineId}`,
      data: { current: { lineId } },
      rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
      disabled: false,
    },
    delta: { x: deltaX, y: deltaY },
    activatorEvent: new PointerEvent("pointerdown", { shiftKey: false }),
    collisions: null,
  } as unknown as DragEndEvent;
}

// -- Tests --------------------------------------------------------------------

describe("DnD on a romanized timeline row", () => {
  beforeEach(() => {
    useTimelineStore.setState({
      rowHeights: {},
      defaultRowHeight: 44,
      collapsedInstances: {},
      selectedWords: [],
    });
  });

  it("places anchorTop and anchorHeight to reflect the romaji band bump for a main-track drag", async () => {
    const { romanizedId } = seedTwoLineProject();
    const lines = useProjectStore.getState().lines;
    const { defaultRowHeight, zoom, rowHeights, collapsedInstances } = useTimelineStore.getState();

    const result = computeDragCellPositions({
      activeDrag: {
        lineId: romanizedId,
        lineIndex: 0,
        wordIndex: 0,
        trackType: "word",
        begin: 0,
        end: 1,
        text: "夜",
      },
      effectiveLines: lines,
      selectedWords: [],
      layoutInputs: {
        lines,
        rowHeights,
        defaultRowHeight,
        collapsedInstances,
        waveformHeight: WAVEFORM_HEIGHT,
        bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
        groupHeaderHeight: GROUP_HEADER_HEIGHT,
      },
      zoom,
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.anchorTop).toBe(WAVEFORM_HEIGHT);
    expect(result.anchorHeight).toBe(defaultRowHeight + ROMAJI_BAND_HEIGHT - 8);
  });

  it("places the bg-track anchorTop below the bumped main band on the romanized row", async () => {
    const { romanizedId } = seedTwoLineProject();
    useProjectStore.setState((s) => ({
      lines: s.lines.map((l) =>
        l.id === romanizedId ? { ...l, backgroundWords: [createWord({ text: "echo", begin: 0.4, end: 0.9 })] } : l,
      ),
    }));
    const lines = useProjectStore.getState().lines;
    const { defaultRowHeight, zoom, rowHeights, collapsedInstances } = useTimelineStore.getState();

    const result = computeDragCellPositions({
      activeDrag: {
        lineId: romanizedId,
        lineIndex: 0,
        wordIndex: 0,
        trackType: "bg",
        begin: 0.4,
        end: 0.9,
        text: "echo",
      },
      effectiveLines: lines,
      selectedWords: [],
      layoutInputs: {
        lines,
        rowHeights,
        defaultRowHeight,
        collapsedInstances,
        waveformHeight: WAVEFORM_HEIGHT,
        bgDropZoneHeight: BG_DROP_ZONE_HEIGHT,
        groupHeaderHeight: GROUP_HEADER_HEIGHT,
      },
      zoom,
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.anchorTop).toBe(WAVEFORM_HEIGHT + defaultRowHeight + ROMAJI_BAND_HEIGHT);
  });

  it("drops a same-line word onto the source band of a romanized line and shifts its timing", async () => {
    const { romanizedId } = seedTwoLineProject();
    const lines = useProjectStore.getState().lines;
    const before = lines.find((l) => l.id === romanizedId)?.words ?? [];

    const { result } = await renderHook(() => useTimelineDnd(lines));
    result.current.handleDragEnd(makeSameLineMainDragEnd(romanizedId, 0, 1, "だけど", 1, 2, 50, 0));

    const after = useProjectStore.getState().lines.find((l) => l.id === romanizedId)?.words ?? [];
    expect(after.length).toBe(before.length);
    expect(after[1].begin).toBeCloseTo(before[1].begin + 0.5, 4);
    expect(after[1].end).toBeCloseTo(before[1].end + 0.5, 4);
  });

  it("does not mutate romaji texts when a source-band word is repositioned", async () => {
    const { romanizedId } = seedTwoLineProject();
    const lines = useProjectStore.getState().lines;
    const beforeRomaji = lines.find((l) => l.id === romanizedId)?.romanization?.wordTexts;
    expect(beforeRomaji?.length).toBe(2);

    const { result } = await renderHook(() => useTimelineDnd(lines));
    result.current.handleDragEnd(makeSameLineMainDragEnd(romanizedId, 0, 1, "だけど", 1, 2, 50, 0));

    const afterRomanization = useProjectStore.getState().lines.find((l) => l.id === romanizedId)?.romanization;
    expect(afterRomanization?.text).toBe("yoru dakedo");
    expect(afterRomanization?.wordTexts?.length).toBe(2);
    expect(afterRomanization?.wordTexts?.[0]).toBe("yoru");
    expect(afterRomanization?.wordTexts?.[1]).toBe("dakedo");
  });

  it("moves a main-track word down to the bg track on a romanized line without touching romaji", async () => {
    const { romanizedId } = seedTwoLineProject();
    const lines = useProjectStore.getState().lines;
    const beforeRomajiText = lines.find((l) => l.id === romanizedId)?.romanization?.text;

    const { result } = await renderHook(() => useTimelineDnd(lines));
    result.current.handleDragEnd(makeMainToBgDragEnd(romanizedId, 0, 0, "夜", 0, 1, 0, 60));

    const after = useProjectStore.getState().lines.find((l) => l.id === romanizedId);
    expect(after?.backgroundWords?.length ?? 0).toBeGreaterThan(0);
    expect(after?.romanization?.text).toBe(beforeRomajiText);
  });
});
