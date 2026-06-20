/**
 * @vitest-environment node
 */
import { setBackground } from "@/domain/line/background";
import { bgBounds } from "@/domain/line/bounds";
import { instanceLineFromTemplate } from "@/domain/group/instance-line";
import { type LyricLine, reconcileLine } from "@/domain/line/model";
import { bgSource, bgText, bgWords, mainWords } from "@/domain/line/voices";
import { isLineSynced as isLineSyncedVoice } from "@/domain/voice/predicates";
import { useProjectStore } from "@/stores/project";
import { decideAddInstancePlacement, templateDuration } from "@/views/timeline/decide-add-instance-placement";
import { fillEmptyLinesWithInstance } from "@/views/timeline/fill-empty-lines-with-instance";
import { instanceToTemplate } from "@/views/timeline/group-ops";
import { beforeEach, describe, expect, it } from "vitest";

// -- Fixtures -----------------------------------------------------------------

// Word-synced main + line-synced background, grouped as instance 0 of g1.
const groupedLineSyncedBg = (): LyricLine =>
  setBackground(
    reconcileLine({
      id: "src",
      agentId: "v1",
      text: "main words",
      groupId: "g1",
      instanceIdx: 0,
      templateLineIdx: 0,
      words: [
        { text: "main ", begin: 30, end: 30.6 },
        { text: "words", begin: 30.6, end: 31 },
      ],
    }),
    { text: "ooh", begin: 30, end: 32, source: "manual" },
  );

// -- instanceToTemplate -------------------------------------------------------

describe("instanceToTemplate · line-synced background", () => {
  it("captures the line-synced background bounds relative to the instance start", () => {
    const tpl = instanceToTemplate([groupedLineSyncedBg()], "g1", 0);
    expect(tpl).toHaveLength(1);
    expect(tpl[0].backgroundWords).toBeUndefined();
    expect(tpl[0].backgroundText).toBe("ooh");
    expect(tpl[0].backgroundTextSource).toBe("manual");
    expect(tpl[0].relativeBackgroundBegin).toBeCloseTo(0);
    expect(tpl[0].relativeBackgroundEnd).toBeCloseTo(2);
  });
});

// -- instanceLineFromTemplate -------------------------------------------------

describe("instanceLineFromTemplate · line-synced background", () => {
  const identity = { id: "new", groupId: "g1", instanceIdx: 1, templateLineIdx: 0 };

  it("rebuilds a line-synced background at the new instance start", () => {
    const [tpl] = instanceToTemplate([groupedLineSyncedBg()], "g1", 0);
    const line = instanceLineFromTemplate(tpl, 50, identity);
    expect(bgWords(line)).toBeUndefined();
    expect(bgBounds(line)).toEqual({ begin: 50, end: 52 });
    expect(bgText(line)).toBe("ooh");
    expect(bgSource(line)).toBe("manual");
    const bg = line.background;
    expect(bg && isLineSyncedVoice(bg)).toBe(true);
  });

  it("still rebuilds a word-synced background from the template", () => {
    const tpl = {
      text: "m",
      agentId: "v1",
      words: [{ text: "m", relativeBegin: 0, relativeEnd: 1 }],
      backgroundText: "ah",
      backgroundWords: [{ text: "ah", relativeBegin: 0, relativeEnd: 0.5 }],
      backgroundTextSource: "extraction" as const,
    };
    const line = instanceLineFromTemplate(tpl, 10, identity);
    expect(bgWords(line)).toEqual([{ text: "ah", begin: 10, end: 10.5 }]);
  });
});

// -- fillEmptyLinesWithInstance -----------------------------------------------

describe("fillEmptyLinesWithInstance · line-synced background", () => {
  it("fills an empty row with a line-synced background", () => {
    const [tpl] = instanceToTemplate([groupedLineSyncedBg()], "g1", 0);
    const empty = reconcileLine({ id: "empty", agentId: "v1", text: "" });
    const result = fillEmptyLinesWithInstance({
      lines: [empty],
      groupId: "g1",
      template: [tpl],
      startIndex: 0,
      instanceStart: 100,
    });
    expect(result.ok).toBe(true);
    const filled = result.updatedLines?.[0];
    if (!filled) throw new Error("expected a filled line");
    expect(bgWords(filled)).toBeUndefined();
    expect(bgBounds(filled)).toEqual({ begin: 100, end: 102 });
    expect(bgText(filled)).toBe("ooh");
  });
});

// -- templateDuration ---------------------------------------------------------

describe("templateDuration · line-synced background", () => {
  it("counts a line-synced background that extends past the main", () => {
    const tpl = [
      {
        text: "m",
        agentId: "v1",
        words: [{ text: "m", relativeBegin: 0, relativeEnd: 1 }],
        backgroundText: "ooh",
        relativeBackgroundBegin: 0,
        relativeBackgroundEnd: 4,
      },
    ];
    expect(templateDuration(tpl)).toBeCloseTo(4);
  });
});

// -- Store round-trips: addInstance and shiftInstance -------------------------

describe("project store · instance ops with a line-synced background", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.getState().clearHistory();
  });

  it("addInstance clones a line-synced background to the new instance", () => {
    useProjectStore.setState({
      lines: [groupedLineSyncedBg()],
      groups: [{ id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 1 }],
    });
    const template = instanceToTemplate(useProjectStore.getState().lines, "g1", 0);
    useProjectStore.getState().addInstance("g1", template, 60, undefined);

    const cloned = useProjectStore.getState().lines.find((l) => l.instanceIdx === 1);
    if (!cloned) throw new Error("expected a cloned instance line");
    expect(bgWords(cloned)).toBeUndefined();
    expect(bgBounds(cloned)).toEqual({ begin: 60, end: 62 });
    expect(bgText(cloned)).toBe("ooh");
    expect(mainWords(cloned)?.length).toBe(2);
  });

  it("regression: editing main words keeps a line-synced background line-synced", () => {
    useProjectStore.setState({ lines: [groupedLineSyncedBg()] });
    useProjectStore.getState().applyWordCountChange(
      "src",
      [
        { text: "main ", begin: 30, end: 30.4 },
        { text: "wor", begin: 30.4, end: 30.7 },
        { text: "ds", begin: 30.7, end: 31 },
      ],
      "words",
      "apply",
    );
    const edited = useProjectStore.getState().lines.find((l) => l.id === "src");
    if (!edited) throw new Error("expected the edited line");
    expect(mainWords(edited)?.length).toBe(3);
    expect(bgWords(edited)).toBeUndefined();
    expect(bgBounds(edited)).toEqual({ begin: 30, end: 32 });
    expect(bgText(edited)).toBe("ooh");
  });

  it("shiftInstance shifts a line-synced background's bounds", () => {
    useProjectStore.setState({
      lines: [groupedLineSyncedBg()],
      groups: [{ id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 1 }],
    });
    useProjectStore.getState().shiftInstance("g1", 0, 5);

    const shifted = useProjectStore.getState().lines.find((l) => l.id === "src");
    if (!shifted) throw new Error("expected the shifted line");
    expect(bgBounds(shifted)).toEqual({ begin: 35, end: 37 });
    expect(bgWords(shifted)).toBeUndefined();
    expect(mainWords(shifted)?.[0].begin).toBeCloseTo(35);
  });

  it("add-instance-at-playhead placement preserves the line-synced background end to end", () => {
    useProjectStore.setState({
      lines: [groupedLineSyncedBg(), reconcileLine({ id: "blank", agentId: "v1", text: "" })],
      groups: [{ id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 1 }],
    });
    const lines = useProjectStore.getState().lines;
    const template = instanceToTemplate(lines, "g1", 0);
    const placement = decideAddInstancePlacement({ lines, groupId: "g1", template, playheadTime: 40 });
    expect(placement.kind).toBe("fill");
    if (placement.kind !== "fill") throw new Error("expected fill placement");
    const filled = placement.updatedLines.find((l) => l.instanceIdx === 1);
    if (!filled) throw new Error("expected a filled instance line");
    expect(bgBounds(filled)).toEqual({ begin: 40, end: 42 });
    expect(bgWords(filled)).toBeUndefined();
  });
});
