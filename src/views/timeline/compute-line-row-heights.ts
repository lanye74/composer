import type { LyricLine } from "@/domain/line/model";
import { getEffectiveLineMainHeight } from "@/views/timeline/get-effective-line-main-height";

// -- Types ---------------------------------------------------------------------

interface ComputeLineRowHeightsInput {
  line: LyricLine;
  baseHeight: number;
  bgDropZoneHeight: number;
}

interface LineRowHeights {
  mainHeight: number;
  bgHeight: number;
  totalHeight: number;
}

// -- Constants -----------------------------------------------------------------

const ROW_BORDER = 1;

// -- Functions -----------------------------------------------------------------

function computeLineRowHeights({ line, baseHeight, bgDropZoneHeight }: ComputeLineRowHeightsInput): LineRowHeights {
  const mainHeight = getEffectiveLineMainHeight(line, baseHeight);
  const hasBg = !!line.backgroundWords && line.backgroundWords.length > 0;
  const bgHeight = hasBg ? baseHeight : bgDropZoneHeight;
  return { mainHeight, bgHeight, totalHeight: mainHeight + bgHeight + ROW_BORDER };
}

// -- Exports -------------------------------------------------------------------

export { computeLineRowHeights };
export type { LineRowHeights };
