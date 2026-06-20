import type { LineTemplate, WordTemplate } from "@/domain/group/template";
import { type LyricLine, reconcileLine } from "@/domain/line/model";
import type { WordTiming } from "@/domain/word/timing";

// -- Types --------------------------------------------------------------------

interface InstanceLineIdentity {
  id: string;
  groupId: string;
  instanceIdx: number;
  templateLineIdx: number;
}

// -- Functions ----------------------------------------------------------------

function materializeWords(words: WordTemplate[], instanceStart: number): WordTiming[] {
  return words.map((w) => ({
    text: w.text,
    begin: w.relativeBegin + instanceStart,
    end: w.relativeEnd + instanceStart,
    ...(w.explicit ? { explicit: true as const } : {}),
  }));
}

// Builds one instance line from a template at instanceStart. The single
// chokepoint shared by addInstance (insert) and fillEmptyLinesWithInstance
// (fill) so the two materialization paths cannot drift. Every voice state
// round-trips through the flat model, including a line-synced background via
// backgroundBegin/backgroundEnd: reconcileLine prefers backgroundWords, then
// those bounds, then plain backgroundText.
function instanceLineFromTemplate(tpl: LineTemplate, instanceStart: number, identity: InstanceLineIdentity): LyricLine {
  return reconcileLine({
    id: identity.id,
    text: tpl.text,
    agentId: tpl.agentId,
    groupId: identity.groupId,
    instanceIdx: identity.instanceIdx,
    templateLineIdx: identity.templateLineIdx,
    ...(tpl.relativeBegin !== undefined ? { begin: tpl.relativeBegin + instanceStart } : {}),
    ...(tpl.relativeEnd !== undefined ? { end: tpl.relativeEnd + instanceStart } : {}),
    ...(tpl.words ? { words: materializeWords(tpl.words, instanceStart) } : {}),
    ...(tpl.backgroundText !== undefined ? { backgroundText: tpl.backgroundText } : {}),
    ...(tpl.backgroundWords ? { backgroundWords: materializeWords(tpl.backgroundWords, instanceStart) } : {}),
    ...(tpl.relativeBackgroundBegin !== undefined && tpl.relativeBackgroundEnd !== undefined
      ? {
          backgroundBegin: tpl.relativeBackgroundBegin + instanceStart,
          backgroundEnd: tpl.relativeBackgroundEnd + instanceStart,
        }
      : {}),
    ...(tpl.backgroundTextSource !== undefined ? { backgroundTextSource: tpl.backgroundTextSource } : {}),
  });
}

// -- Exports ------------------------------------------------------------------

export { instanceLineFromTemplate };
export type { InstanceLineIdentity };
