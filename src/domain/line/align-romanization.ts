import type { RomanizationData } from "@/domain/line/model";

function alignRomanizationToWords(
  romanization: RomanizationData | undefined,
  wordCount: number,
): RomanizationData | undefined {
  if (!romanization) return romanization;
  if (!romanization.wordTexts) return romanization;
  if (wordCount <= 0) {
    const { wordTexts: _drop, ...rest } = romanization;
    return rest;
  }
  if (romanization.wordTexts.length === wordCount) return romanization;
  const next = romanization.wordTexts.slice(0, wordCount);
  while (next.length < wordCount) next.push("");
  return { ...romanization, wordTexts: next };
}

export { alignRomanizationToWords };
