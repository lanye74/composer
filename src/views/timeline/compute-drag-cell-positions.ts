import { isWordSelected } from "@/domain/selection/identity";
import type { LyricLine } from "@/domain/line/model";
import type { WordSelection } from "@/domain/selection/model";
import {
  expandSelectionToGroupmates,
  getSyllablePositions,
  type SyllablePosition,
} from "@/domain/word/syllable-groups";
import { computeRowLayout } from "@/views/timeline/utils";

// -- Types ---------------------------------------------------------------------

interface DragAnchor {
  lineId: string;
  lineIndex: number;
  wordIndex: number;
  trackType: "word" | "bg";
  begin: number;
  end: number;
  text: string;
}

interface RowLayoutInputs {
  lines: LyricLine[];
  rowHeights: Record<string, number>;
  defaultRowHeight: number;
  collapsedInstances: Record<string, boolean>;
  waveformHeight: number;
  bgDropZoneHeight: number;
  groupHeaderHeight: number;
}

interface ComputeDragCellPositionsInput {
  activeDrag: DragAnchor | null;
  effectiveLines: LyricLine[];
  selectedWords: ReadonlyArray<WordSelection>;
  layoutInputs: RowLayoutInputs;
  zoom: number;
}

interface DragCell {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  syllablePosition: SyllablePosition;
}

interface DragCellPositions {
  cells: DragCell[];
  anchorWidth: number;
  anchorHeight: number;
  anchorTop: number;
}

// -- Constants -----------------------------------------------------------------

const CELL_VERTICAL_PADDING = 8;
const MIN_CELL_WIDTH = 4;

// -- Functions -----------------------------------------------------------------

function computeDragCellPositions({
  activeDrag,
  effectiveLines,
  selectedWords,
  layoutInputs,
  zoom,
}: ComputeDragCellPositionsInput): DragCellPositions | null {
  if (!activeDrag) return null;

  const layout = computeRowLayout(layoutInputs);
  const anchorPos = layout.lineTops.get(activeDrag.lineId);
  if (!anchorPos) return null;

  const anchorLeft = activeDrag.begin * zoom;
  const anchorTop = activeDrag.trackType === "bg" ? anchorPos.top + anchorPos.mainHeight : anchorPos.top;
  const anchorRawHeight = activeDrag.trackType === "bg" ? anchorPos.bgHeight : anchorPos.mainHeight;
  const anchorHeight = anchorRawHeight - CELL_VERTICAL_PADDING;
  const anchorWidth = Math.max((activeDrag.end - activeDrag.begin) * zoom, MIN_CELL_WIDTH);

  const inSelection = isWordSelected(selectedWords, activeDrag.lineId, activeDrag.wordIndex, activeDrag.trackType);

  const baseSelections: ReadonlyArray<WordSelection> =
    inSelection && selectedWords.length > 1
      ? selectedWords
      : [
          {
            lineId: activeDrag.lineId,
            lineIndex: activeDrag.lineIndex,
            wordIndex: activeDrag.wordIndex,
            type: activeDrag.trackType,
          },
        ];

  const lineById = new Map(effectiveLines.map((l) => [l.id, l]));

  const wordsToShow: WordSelection[] = [];
  const seen = new Set<string>();
  for (const sel of baseSelections) {
    const line = lineById.get(sel.lineId);
    const wordsArray = sel.type === "word" ? line?.words : line?.backgroundWords;
    if (!line || !wordsArray) continue;
    const indices = expandSelectionToGroupmates(wordsArray, [sel.wordIndex]);
    for (const idx of indices) {
      const key = `${sel.lineId}:${sel.type}:${idx}`;
      if (seen.has(key)) continue;
      seen.add(key);
      wordsToShow.push({ lineId: sel.lineId, lineIndex: sel.lineIndex, wordIndex: idx, type: sel.type });
    }
  }

  if (wordsToShow.length <= 1) {
    return {
      cells: [
        {
          text: activeDrag.text,
          left: 0,
          top: 0,
          width: anchorWidth,
          height: anchorHeight,
          syllablePosition: "none",
        },
      ],
      anchorWidth,
      anchorHeight,
      anchorTop,
    };
  }

  const positionsByLineTrack = new Map<string, SyllablePosition[]>();
  const positionFor = (lineId: string, type: "word" | "bg", idx: number): SyllablePosition => {
    const key = `${lineId}:${type}`;
    let positions = positionsByLineTrack.get(key);
    if (!positions) {
      const line = lineById.get(lineId);
      const wordsArray = type === "word" ? line?.words : line?.backgroundWords;
      positions = wordsArray ? getSyllablePositions(wordsArray) : [];
      positionsByLineTrack.set(key, positions);
    }
    return positions[idx] ?? "none";
  };

  const cells = wordsToShow.map<DragCell>((sel) => {
    const line = lineById.get(sel.lineId);
    const wordsArray = sel.type === "word" ? line?.words : line?.backgroundWords;
    const word = wordsArray?.[sel.wordIndex];
    if (!word || !line) {
      return { text: "", left: 0, top: 0, width: 0, height: 0, syllablePosition: "none" };
    }
    const pos = layout.lineTops.get(line.id);
    if (!pos) {
      return { text: "", left: 0, top: 0, width: 0, height: 0, syllablePosition: "none" };
    }

    const cellRowTop = sel.type === "bg" ? pos.top + pos.mainHeight : pos.top;
    const cellRowHeight = sel.type === "bg" ? pos.bgHeight : pos.mainHeight;
    const cellLeft = word.begin * zoom - anchorLeft;
    const cellTop = cellRowTop - anchorTop;
    const cellWidth = Math.max((word.end - word.begin) * zoom, MIN_CELL_WIDTH);
    const cellHeight = cellRowHeight - CELL_VERTICAL_PADDING;

    return {
      text: word.text.trimEnd(),
      left: cellLeft,
      top: cellTop,
      width: cellWidth,
      height: cellHeight,
      syllablePosition: positionFor(sel.lineId, sel.type, sel.wordIndex),
    };
  });

  return { cells, anchorWidth, anchorHeight, anchorTop };
}

// -- Exports -------------------------------------------------------------------

export { computeDragCellPositions };
export type { DragAnchor, DragCell, DragCellPositions };
