import type { WordTiming } from "@/domain/word/timing";

// -- Types --------------------------------------------------------------------

interface RomanizationData {
  text: string;
  wordTexts?: string[];
  source: "manual" | "generated";
  engine?: string;
}

interface LineFields {
  id: string;
  text: string;
  agentId: string;
  backgroundText?: string;
  backgroundWords?: WordTiming[];
  backgroundTextSource?: "extraction" | "manual";
  groupId?: string;
  instanceIdx?: number;
  templateLineIdx?: number;
  detached?: boolean;
  romanization?: RomanizationData;
}

// LyricLine is a discriminated union over its timing shape. The discriminant is
// structural (presence of `words` vs `begin`/`end`), not a literal `kind` tag,
// so saved projects need no migration. The `never` constraints make a both-state
// line (`words` + `begin`) a compile error at every constructor and write.
interface WordSyncedLine extends LineFields {
  words: WordTiming[];
  begin?: never;
  end?: never;
}

interface LineSyncedLine extends LineFields {
  begin: number;
  end: number;
  words?: never;
}

interface UntimedLine extends LineFields {
  words?: never;
  begin?: never;
  end?: never;
}

type LyricLine = WordSyncedLine | LineSyncedLine | UntimedLine;

// A line shape before reconcileLine narrows it to a concrete variant: any
// combination of timing fields may be present. Used for merge scratch objects.
type LooseLine = LineFields & { words?: WordTiming[]; begin?: number; end?: number };

// -- Functions ----------------------------------------------------------------

// The store builds lines by spreading `...line` (a union member) together with
// Partial<LyricLine> updates or fresh timing fields. A generic spread widens
// past the LyricLine union, so reconcileLine re-narrows a freshly merged line
// into exactly one variant by its runtime shape. It enforces the core
// invariant: a line is never both word-synced and line-synced. A `words` array
// (even empty) wins and drops begin/end.
function reconcileLine(line: LooseLine): LyricLine {
  const { words, begin, end, romanization, ...rest } = line;
  const reconciledRomanization = romanization ? reconcileRomanization(romanization, words) : undefined;
  if (words !== undefined) {
    return reconciledRomanization ? { ...rest, words, romanization: reconciledRomanization } : { ...rest, words };
  }
  if (begin !== undefined && end !== undefined) {
    return reconciledRomanization
      ? { ...rest, begin, end, romanization: reconciledRomanization }
      : { ...rest, begin, end };
  }
  return reconciledRomanization ? { ...rest, romanization: reconciledRomanization } : rest;
}

function reconcileRomanization(r: RomanizationData, words: LooseLine["words"]): RomanizationData {
  if (!r.wordTexts) return r;
  if (words && r.wordTexts.length === words.length) return r;
  const { wordTexts: _drop, ...rest } = r;
  return rest;
}

// -- Exports ------------------------------------------------------------------

export { reconcileLine };

export type { LineFields, LineSyncedLine, LyricLine, LooseLine, RomanizationData };
