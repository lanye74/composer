import type { LyricLine } from "@/domain/line/model";
import type { ProjectMetadata } from "@/domain/project/metadata";
import { formatTime } from "@/utils/format-time";

// -- Constants ----------------------------------------------------------------

const COMPOSER_URL = "https://composer.boidu.dev";

// -- Helpers ------------------------------------------------------------------

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function shouldEmitTransliterations(metadata: ProjectMetadata, lines: LyricLine[]): boolean {
  if (!metadata.romanizationScheme) return false;
  return lines.some((line) => line.romanization && line.romanization.text.length > 0);
}

type EmittableLine = {
  id: string;
  romanization: NonNullable<LyricLine["romanization"]>;
  sourceWords?: LyricLine["words"];
};

function selectEmittableLines(lines: LyricLine[], displayIdByLineId: ReadonlyMap<string, string>): EmittableLine[] {
  const out: EmittableLine[] = [];
  for (const line of lines) {
    const r = line.romanization;
    if (!r || r.text.length === 0) continue;
    const id = displayIdByLineId.get(line.id) ?? line.id;
    out.push({ id, romanization: r, sourceWords: line.words });
  }
  return out;
}

function canEmitWordSpans(em: EmittableLine): boolean {
  const wordTexts = em.romanization.wordTexts;
  if (!wordTexts?.length) return false;
  if (!em.sourceWords?.length) return false;
  return wordTexts.length === em.sourceWords.length;
}

function emitWordSpans(em: EmittableLine, ind: (n: number) => string, indent: number): string[] {
  const wordTexts = em.romanization.wordTexts;
  const sourceWords = em.sourceWords;
  if (!wordTexts || !sourceWords) return [];
  const parts: string[] = [];
  for (let i = 0; i < wordTexts.length; i++) {
    const w = sourceWords[i];
    parts.push(
      `${ind(indent)}<span begin="${formatTime(w.begin)}" end="${formatTime(w.end)}">${escapeXml(wordTexts[i])}</span>`,
    );
  }
  return parts;
}

function emitTransliteration(scheme: string, em: EmittableLine, ind: (n: number) => string): string[] {
  const idAttr = escapeXml(em.id);
  const langAttr = escapeXml(scheme);
  const parts: string[] = [];
  parts.push(`${ind(4)}<transliteration for="${idAttr}" xml:lang="${langAttr}">`);
  if (canEmitWordSpans(em)) {
    parts.push(`${ind(5)}<text for="${idAttr}">`);
    parts.push(...emitWordSpans(em, ind, 6));
    parts.push(`${ind(5)}</text>`);
  } else {
    parts.push(`${ind(5)}<text for="${idAttr}">${escapeXml(em.romanization.text)}</text>`);
  }
  parts.push(`${ind(4)}</transliteration>`);
  return parts;
}

function emitTransliterationsBlock(
  metadata: ProjectMetadata,
  lines: LyricLine[],
  ind: (n: number) => string,
  displayIdByLineId: ReadonlyMap<string, string>,
): string[] {
  const scheme = metadata.romanizationScheme ?? "";
  const emittable = selectEmittableLines(lines, displayIdByLineId);
  const parts: string[] = [];
  parts.push(`${ind(3)}<transliterations>`);
  for (const em of emittable) {
    parts.push(...emitTransliteration(scheme, em, ind));
  }
  parts.push(`${ind(3)}</transliterations>`);
  return parts;
}

function emitGeneratorElement(version: string, ind: (n: number) => string): string {
  return `${ind(3)}<composer:generator version="${escapeXml(version)}" url="${COMPOSER_URL}"/>`;
}

// -- Exports ------------------------------------------------------------------

export { emitGeneratorElement, emitTransliterationsBlock, shouldEmitTransliterations };
