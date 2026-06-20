import { followMainGranularity } from "@/domain/line/follow-main-granularity";
import { type LooseLine, type LyricLine, reconcileLine, toFlat } from "@/domain/line/model";

// -- Functions ----------------------------------------------------------------

// The reconcile chokepoint for the generic per-line update mutators. Merges the
// flat update onto the line's flat projection and lifts back to nested. The flat
// round-trip is lossless (toFlat carries backgroundBegin/end), so a line-synced
// background the update leaves untouched survives intact. followMainGranularity
// then resolves the background against the new main, distributing a line-synced
// background over its OWN bounds on the main-to-word transition.
function reconcileUpdate(prev: LyricLine, updates: Partial<LooseLine>): LyricLine {
  return followMainGranularity(prev, reconcileLine({ ...toFlat(prev), ...updates }));
}

// -- Exports ------------------------------------------------------------------

export { reconcileUpdate };
