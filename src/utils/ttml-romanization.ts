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

// Word-synced romanization preserves per-word timing as <span> children.
// Line-synced romanization unwraps to inline text inside <text>.
function emitTransliterationsBlock(
  metadata: ProjectMetadata,
  lines: LyricLine[],
  ind: (n: number) => string,
): string[] {
  const parts: string[] = [];
  const scheme = metadata.romanizationScheme ?? "";
  parts.push(`${ind(3)}<transliterations>`);
  parts.push(`${ind(4)}<transliteration xml:lang="${escapeXml(scheme)}">`);
  for (const line of lines) {
    const r = line.romanization;
    if (!r || r.text.length === 0) continue;
    if (r.words?.length) {
      parts.push(`${ind(5)}<text for="${escapeXml(line.id)}">`);
      for (const w of r.words) {
        parts.push(
          `${ind(6)}<span begin="${formatTime(w.begin)}" end="${formatTime(w.end)}">${escapeXml(w.text)}</span>`,
        );
      }
      parts.push(`${ind(5)}</text>`);
    } else {
      parts.push(`${ind(5)}<text for="${escapeXml(line.id)}">${escapeXml(r.text)}</text>`);
    }
  }
  parts.push(`${ind(4)}</transliteration>`);
  parts.push(`${ind(3)}</transliterations>`);
  return parts;
}

function emitGeneratorElement(version: string, ind: (n: number) => string): string {
  return `${ind(3)}<composer:generator version="${escapeXml(version)}" url="${COMPOSER_URL}"/>`;
}

// -- Exports ------------------------------------------------------------------

export { emitGeneratorElement, emitTransliterationsBlock, shouldEmitTransliterations };
