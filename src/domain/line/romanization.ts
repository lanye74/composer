import type { LyricLine } from "@/domain/line/model";

// -- Predicates ---------------------------------------------------------------

function hasRomanization(line: LyricLine): boolean {
  return !!line.romanization && line.romanization.text.length > 0;
}

function isRomanizationManual(line: LyricLine): boolean {
  return line.romanization?.source === "manual";
}

function isRomanizationGenerated(line: LyricLine): boolean {
  return line.romanization?.source === "generated";
}

// -- Exports ------------------------------------------------------------------

export { hasRomanization, isRomanizationGenerated, isRomanizationManual };
