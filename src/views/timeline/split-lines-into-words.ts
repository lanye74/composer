import { manualBackgroundWordEdit } from "@/domain/line/background";
import { bgBounds } from "@/domain/line/bounds";
import { toFlat, type LooseLine, type LyricLine } from "@/domain/line/model";
import { isLineSynced } from "@/domain/line/predicates";
import { bgText, bgVoice } from "@/domain/line/voices";
import type { WordSelection } from "@/domain/selection/model";
import { isLineSynced as isVoiceLineSynced } from "@/domain/voice/predicates";
import type { WordTiming } from "@/domain/word/timing";
import { useProjectStore } from "@/stores/project";
import { convertLineToWord } from "@/utils/sync-helpers";
import { useTimelineStore } from "@/views/timeline/timeline-store";

// -- Types --------------------------------------------------------------------

type SplitVoice = "main" | "bg";

interface LineWordsUpdate {
  id: string;
  updates: Partial<LooseLine>;
}

// -- Pure computation ----------------------------------------------------------

function mainUpdate(realLine: LyricLine): Partial<LooseLine> | null {
  if (!isLineSynced(realLine)) return null;
  const converted = convertLineToWord(toFlat(realLine));
  if (!converted.words) return null;
  return { words: converted.words, begin: undefined, end: undefined };
}

// Splits a line-synced background over its OWN bounds. toFlat drops a line-synced
// background's begin/end, so the bounds and text are read from the nested voice
// (bgBounds/bgText), then fed through the same distribution primitive the main
// split uses. Writing the words via manualBackgroundWordEdit stamps "manual"
// provenance and keeps backgroundText coherent, matching the timeline's other
// bg-word write paths (retime, merge).
function bgUpdate(realLine: LyricLine): Partial<LooseLine> | null {
  const bg = bgVoice(realLine);
  if (bg === null || !isVoiceLineSynced(bg)) return null;
  const bounds = bgBounds(realLine);
  const text = bgText(realLine);
  if (bounds === null || text === undefined) return null;
  const seed: { text: string; begin: number; end: number; words?: WordTiming[] } = {
    text,
    begin: bounds.begin,
    end: bounds.end,
  };
  const converted = convertLineToWord(seed);
  if (!converted.words) return null;
  return manualBackgroundWordEdit(converted.words);
}

function computeSplitIntoWordsUpdates(
  targetLineIds: Iterable<string>,
  rawLines: LyricLine[],
  voice: SplitVoice,
): LineWordsUpdate[] {
  const rawLinesById = new Map<string, LyricLine>();
  for (const line of rawLines) rawLinesById.set(line.id, line);

  const updates: LineWordsUpdate[] = [];
  for (const id of targetLineIds) {
    const realLine = rawLinesById.get(id);
    if (!realLine) continue;
    const update = voice === "main" ? mainUpdate(realLine) : bgUpdate(realLine);
    if (update) updates.push({ id, updates: update });
  }
  return updates;
}

function computeSplitSelections(
  updates: LineWordsUpdate[],
  effectiveLines: LyricLine[],
  voice: SplitVoice,
): WordSelection[] {
  const lineIndexById = new Map<string, number>();
  for (let i = 0; i < effectiveLines.length; i++) lineIndexById.set(effectiveLines[i].id, i);

  const type = voice === "main" ? "word" : "bg";
  const selections: WordSelection[] = [];
  for (const update of updates) {
    const lineIndex = lineIndexById.get(update.id);
    const words = voice === "main" ? update.updates.words : update.updates.backgroundWords;
    if (lineIndex === undefined || !words) continue;
    for (let wi = 0; wi < words.length; wi++) {
      selections.push({ lineId: update.id, lineIndex, wordIndex: wi, type });
    }
  }
  return selections;
}

// -- Store-mutating operation --------------------------------------------------

function splitVoiceIntoWords(targetLineIds: Iterable<string>, effectiveLines: LyricLine[], voice: SplitVoice): void {
  const projectState = useProjectStore.getState();
  const updates = computeSplitIntoWordsUpdates(targetLineIds, projectState.lines, voice);

  if (updates.length === 1) {
    projectState.updateLineWithHistory(updates[0].id, updates[0].updates);
  } else if (updates.length > 1) {
    projectState.updateLinesWithHistory(updates);
  }

  const newSelections = computeSplitSelections(updates, effectiveLines, voice);
  if (newSelections.length > 0) {
    useTimelineStore.getState().setSelectedWords(newSelections);
  }
}

// -- Exports -------------------------------------------------------------------

export { computeSplitIntoWordsUpdates, computeSplitSelections, splitVoiceIntoWords };
export type { SplitVoice };
