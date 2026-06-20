import type { BackgroundSource, BackgroundVoice, Voice } from "@/domain/voice/model";
import type { WordTiming } from "@/domain/word/timing";

// -- Types --------------------------------------------------------------------

interface LineFields {
  id: string;
  text: string;
  agentId: string;
  backgroundText?: string;
  backgroundWords?: WordTiming[];
  backgroundTextSource?: BackgroundSource;
  groupId?: string;
  instanceIdx?: number;
  templateLineIdx?: number;
  detached?: boolean;
}

// A line shape before reconcileLine lifts it to the nested model: any
// combination of flat timing fields may be present. This is the input type for
// reconcileLine and for every store update payload (callers stay flat). The
// background mirrors the main: backgroundWords for word-synced,
// backgroundBegin/backgroundEnd for line-synced, backgroundText alone for
// untimed. Because all three states are expressible here, the flat round-trip
// is lossless and never silently drops a line-synced background.
type LooseLine = LineFields & {
  words?: WordTiming[];
  begin?: number;
  end?: number;
  backgroundBegin?: number;
  backgroundEnd?: number;
};

// Identity fields stay flat on the stored line; timing lives nested inside the
// main Voice and optional background BackgroundVoice.
type LineIdentity = {
  id: string;
  agentId: string;
  groupId?: string;
  instanceIdx?: number;
  templateLineIdx?: number;
  detached?: boolean;
};

type NestedLyricLine = LineIdentity & { main: Voice; background?: BackgroundVoice };

// The stored line shape: nested timing, flat identity. Reads go through the
// voice seam (`@/domain/line/voices`); writes go through reconcileLine (which
// takes flat input and lifts to nested) or toFlat + reconcileLine for merges.
type LyricLine = NestedLyricLine;

// -- Functions ----------------------------------------------------------------

// Lifts a flat LooseLine to the nested stored model. A `words` array (even
// empty) makes the main voice word-synced and drops begin/end; otherwise a
// begin/end pair makes it line-synced; otherwise it is untimed. The background
// mirrors that precedence: a non-empty backgroundWords array wins, else a
// backgroundBegin/backgroundEnd pair makes it line-synced, else backgroundText
// alone makes it untimed. The provenance source rides along. This is the single
// write chokepoint: every store update merges flat fields then calls reconcileLine.
function reconcileLine(line: LooseLine): LyricLine {
  const {
    words,
    begin,
    end,
    backgroundText,
    backgroundWords,
    backgroundBegin,
    backgroundEnd,
    backgroundTextSource,
    text,
    ...identity
  } = line;
  const main: Voice =
    words !== undefined ? { text, words } : begin !== undefined && end !== undefined ? { text, begin, end } : { text };
  let background: BackgroundVoice | undefined;
  if (backgroundWords !== undefined && backgroundWords.length > 0) {
    background = { text: backgroundText ?? "", words: backgroundWords, source: backgroundTextSource };
  } else if (backgroundBegin !== undefined && backgroundEnd !== undefined) {
    background = {
      text: backgroundText ?? "",
      begin: backgroundBegin,
      end: backgroundEnd,
      source: backgroundTextSource,
    };
  } else if (backgroundText !== undefined) {
    background = { text: backgroundText, source: backgroundTextSource };
  }
  return background !== undefined ? { ...identity, main, background } : { ...identity, main };
}

// Flattens a stored nested line back to a LooseLine. The inverse of
// reconcileLine: spreads identity, derives the flat timing fields from the main
// voice variant, and the flat background fields from the background voice. Used
// to merge a flat update payload onto an existing stored line:
// reconcileLine({ ...toFlat(line), ...updates }).
function toFlat(line: LyricLine): LooseLine {
  const { main, background, ...identity } = line;
  const flat: LooseLine = { ...identity, text: main.text };
  if ("words" in main) flat.words = main.words;
  else if ("begin" in main) {
    flat.begin = main.begin;
    flat.end = main.end;
  }
  if (background !== undefined) {
    flat.backgroundText = background.text;
    if ("words" in background) flat.backgroundWords = background.words;
    else if ("begin" in background) {
      flat.backgroundBegin = background.begin;
      flat.backgroundEnd = background.end;
    }
    flat.backgroundTextSource = background.source;
  }
  return flat;
}

// -- Exports ------------------------------------------------------------------

export { reconcileLine, toFlat };

export type { LineFields, LineIdentity, LyricLine, LooseLine, NestedLyricLine };
