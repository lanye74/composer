import type { LyricLine } from "@/domain/line/model";
import type { Voice } from "@/domain/voice/model";

// -- Functions ----------------------------------------------------------------

// Shifts one voice by delta seconds, preserving its granularity and any word
// metadata (the explicit flag rides along via the spread). An untimed voice is
// returned unchanged. Generic so a BackgroundVoice keeps its source field.
function shiftVoiceBy<V extends Voice>(voice: V, delta: number): V {
  if ("words" in voice) {
    return { ...voice, words: voice.words.map((w) => ({ ...w, begin: w.begin + delta, end: w.end + delta })) };
  }
  if ("begin" in voice) {
    return { ...voice, begin: voice.begin + delta, end: voice.end + delta };
  }
  return voice;
}

// Shifts every timed voice on a line (main and background, at whatever
// granularity each one has) by delta seconds. This is the nested shift the flat
// round-trip historically could not express: shifting a line-synced background
// through reconcileLine used to drop its bounds because toFlat could not carry
// them. Never mutates the input.
function shiftLineBy(line: LyricLine, delta: number): LyricLine {
  const next: LyricLine = { ...line, main: shiftVoiceBy(line.main, delta) };
  if (line.background) next.background = shiftVoiceBy(line.background, delta);
  return next;
}

// -- Exports ------------------------------------------------------------------

export { shiftLineBy, shiftVoiceBy };
