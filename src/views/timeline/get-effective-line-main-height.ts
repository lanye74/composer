import { hasRomanization } from "@/domain/line/romanization";
import type { LyricLine } from "@/domain/line/model";

// -- Constants ----------------------------------------------------------------

const ROMAJI_BAND_HEIGHT = 16;

// -- Functions ----------------------------------------------------------------

function getEffectiveLineMainHeight(line: LyricLine, base: number): number {
  const safeBase = Math.max(0, base);
  return safeBase + (hasRomanization(line) ? ROMAJI_BAND_HEIGHT : 0);
}

// -- Exports ------------------------------------------------------------------

export { getEffectiveLineMainHeight, ROMAJI_BAND_HEIGHT };
