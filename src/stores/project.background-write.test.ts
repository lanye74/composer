/**
 * @vitest-environment node
 */
import type { LinkGroup } from "@/domain/group/template";
import { bgBounds, mainBounds } from "@/domain/line/bounds";
import { type LooseLine, reconcileLine } from "@/domain/line/model";
import { applyBackground } from "@/domain/line/background";
import { bgVoice, bgWords } from "@/domain/line/voices";
import { isLineSynced, isWordSynced } from "@/domain/voice/predicates";
import { useProjectStore } from "@/stores/project";
import { beforeEach, describe, expect, it } from "vitest";

// Store half of the #122 fix: a nested-aware background write path that persists
// a resolver-resolved (possibly line-synced) background. The flat update API
// cannot carry a line-synced background, so an untimed bg text over a
// line-synced main used to be word-split. These tests exercise the real store
// actions with real data, no mocks.

beforeEach(() => {
  useProjectStore.getState().reset();
  useProjectStore.getState().clearHistory();
});

function seedGroup(id: string): LinkGroup {
  return { id, label: "Chorus", color: "#f472b6", templateVersion: 1 };
}

// Seeds lines in a single setState and marks the store dirty-since-history so
// the first *WithHistory mutation snapshots this state as the undo baseline.
function seed(lines: LooseLine[], groups: LinkGroup[] = []) {
  useProjectStore.setState({
    groups,
    lines: lines.map(reconcileLine),
    isDirtySinceHistory: true,
  });
}

function getLine(id: string) {
  const line = useProjectStore.getState().lines.find((l) => l.id === id);
  if (!line) throw new Error(`line ${id} not found`);
  return line;
}

describe("project store · applyLineBackground", () => {
  it("regression: line-synced line keeps line-synced background (#122)", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);

    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });

    const stored = getLine("L1");
    expect(bgBounds(stored)).toEqual({ begin: 4, end: 6 });
    expect(bgWords(stored)).toBeUndefined();
    const bg = bgVoice(stored);
    expect(bg).not.toBeNull();
    if (bg) expect(isLineSynced(bg)).toBe(true);
  });

  it("distributes bg to word-synced over a word-synced main", () => {
    seed([
      {
        id: "L1",
        text: "Real line",
        agentId: "v1",
        words: [
          { text: "Real ", begin: 0, end: 1 },
          { text: "line", begin: 1, end: 2 },
        ],
      },
    ]);

    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });

    const stored = getLine("L1");
    const words = bgWords(stored);
    expect(words).toBeDefined();
    const bg = bgVoice(stored);
    expect(bg).not.toBeNull();
    if (bg) expect(isWordSynced(bg)).toBe(true);
  });

  it("keeps bg untimed over an untimed main", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1" }]);

    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });

    const stored = getLine("L1");
    expect(bgWords(stored)).toBeUndefined();
    expect(bgBounds(stored)).toBeNull();
    const bg = bgVoice(stored);
    expect(bg).not.toBeNull();
  });

  it("keeps a word-synced params verbatim regardless of main granularity", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);

    const words = [
      { text: "ooh ", begin: 3, end: 4 },
      { text: "aah", begin: 4, end: 5 },
    ];
    useProjectStore.getState().applyLineBackground("L1", { words, source: "extraction" });

    const stored = getLine("L1");
    expect(bgWords(stored)).toEqual(words);
    const bg = bgVoice(stored);
    if (bg) expect(isWordSynced(bg)).toBe(true);
  });

  it("no-ops when the target line is absent", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);
    const before = useProjectStore.getState().lines;

    useProjectStore.getState().applyLineBackground("missing", { text: "ooh", source: "manual" });

    expect(useProjectStore.getState().lines).toBe(before);
  });
});

describe("project store · applyLineBackground · clearing", () => {
  it("removes a line-synced background entirely on empty text", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);
    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });
    expect(bgVoice(getLine("L1"))).not.toBeNull();

    useProjectStore.getState().applyLineBackground("L1", { text: "", source: "manual" });

    expect(bgVoice(getLine("L1"))).toBeNull();
  });

  it("removes a word-synced background entirely on empty text", () => {
    seed([
      {
        id: "L1",
        text: "Real line",
        agentId: "v1",
        words: [{ text: "Real line", begin: 0, end: 2 }],
        backgroundText: "ooh",
        backgroundWords: [{ text: "ooh", begin: 1, end: 2 }],
        backgroundTextSource: "extraction",
      },
    ]);
    expect(bgVoice(getLine("L1"))).not.toBeNull();

    useProjectStore.getState().applyLineBackground("L1", { text: "", source: "manual" });

    expect(bgVoice(getLine("L1"))).toBeNull();
  });
});

describe("project store · applyLineBackground · history", () => {
  it("undo restores the prior line and redo re-applies", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);

    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });
    expect(bgVoice(getLine("L1"))).not.toBeNull();
    expect(useProjectStore.getState().canUndo()).toBe(true);

    useProjectStore.getState().undo();
    expect(bgVoice(getLine("L1"))).toBeNull();

    useProjectStore.getState().redo();
    const restored = getLine("L1");
    expect(bgBounds(restored)).toEqual({ begin: 4, end: 6 });
    const bg = bgVoice(restored);
    if (bg) expect(isLineSynced(bg)).toBe(true);
  });
});

describe("project store · applyLineBackground · sibling propagation", () => {
  it("re-resolves each linked sibling's bg over its own bounds", () => {
    seed(
      [
        {
          id: "a0",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 0,
          templateLineIdx: 0,
          begin: 0,
          end: 4,
        },
        {
          id: "a1",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 1,
          templateLineIdx: 0,
          begin: 10,
          end: 20,
        },
      ],
      [seedGroup("g1")],
    );

    useProjectStore.getState().applyLineBackground("a0", { text: "ooh", source: "manual" });

    const a0 = getLine("a0");
    const a1 = getLine("a1");
    expect(bgBounds(a0)).toEqual({ begin: 2, end: 4 });
    expect(bgBounds(a1)).toEqual({ begin: 15, end: 20 });
    const bg0 = bgVoice(a0);
    const bg1 = bgVoice(a1);
    expect(bg0).not.toBeNull();
    expect(bg1).not.toBeNull();
    expect(isLineSynced(bg0 as NonNullable<typeof bg0>)).toBe(true);
    expect(isLineSynced(bg1 as NonNullable<typeof bg1>)).toBe(true);
  });

  it("re-resolves per sibling main granularity, not by copying timing", () => {
    seed(
      [
        {
          id: "a0",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 0,
          templateLineIdx: 0,
          begin: 0,
          end: 4,
        },
        {
          id: "a1",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 1,
          templateLineIdx: 0,
          words: [
            { text: "Real ", begin: 10, end: 11 },
            { text: "line", begin: 11, end: 12 },
          ],
        },
      ],
      [seedGroup("g1")],
    );

    useProjectStore.getState().applyLineBackground("a0", { text: "ooh", source: "manual" });

    const bg0 = bgVoice(getLine("a0"));
    const bg1 = bgVoice(getLine("a1"));
    expect(bg0).not.toBeNull();
    expect(bg1).not.toBeNull();
    expect(isLineSynced(bg0 as NonNullable<typeof bg0>)).toBe(true);
    expect(isWordSynced(bg1 as NonNullable<typeof bg1>)).toBe(true);
  });

  it("leaves a detached sibling untouched", () => {
    seed(
      [
        {
          id: "a0",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 0,
          templateLineIdx: 0,
          begin: 0,
          end: 4,
        },
        {
          id: "a1",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 1,
          templateLineIdx: 0,
          begin: 10,
          end: 20,
          detached: true,
        },
      ],
      [seedGroup("g1")],
    );

    useProjectStore.getState().applyLineBackground("a0", { text: "ooh", source: "manual" });

    expect(bgVoice(getLine("a0"))).not.toBeNull();
    expect(bgVoice(getLine("a1"))).toBeNull();
  });

  it("propagateToSiblings: false leaves the sibling untouched", () => {
    seed(
      [
        {
          id: "a0",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 0,
          templateLineIdx: 0,
          begin: 0,
          end: 4,
        },
        {
          id: "a1",
          text: "Real line",
          agentId: "v1",
          groupId: "g1",
          instanceIdx: 1,
          templateLineIdx: 0,
          begin: 10,
          end: 20,
        },
      ],
      [seedGroup("g1")],
    );
    const a1Before = getLine("a1");

    useProjectStore
      .getState()
      .applyLineBackground("a0", { text: "ooh", source: "manual" }, { propagateToSiblings: false });

    expect(bgVoice(getLine("a0"))).not.toBeNull();
    expect(getLine("a1")).toBe(a1Before);
    expect(bgVoice(getLine("a1"))).toBeNull();
  });
});

describe("project store · setLineWithHistory", () => {
  it("persists a line-synced background carried on the replacement line", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);

    const target = getLine("L1");
    const replacement = applyBackground(target, { text: "ooh", source: "manual" });
    expect(bgBounds(replacement)).toEqual({ begin: 4, end: 6 });

    useProjectStore.getState().setLineWithHistory("L1", replacement);

    const stored = getLine("L1");
    expect(bgBounds(stored)).toEqual({ begin: 4, end: 6 });
    expect(bgWords(stored)).toBeUndefined();
    const bg = bgVoice(stored);
    if (bg) expect(isLineSynced(bg)).toBe(true);
  });

  it("drops the background when the replacement line has none", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);
    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });
    expect(bgVoice(getLine("L1"))).not.toBeNull();

    const cleared = reconcileLine({ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 });
    useProjectStore.getState().setLineWithHistory("L1", cleared);

    expect(bgVoice(getLine("L1"))).toBeNull();
  });

  it("is a no-op for a missing target and commits no history entry", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);
    const linesBefore = useProjectStore.getState().lines;
    const canUndoBefore = useProjectStore.getState().canUndo();

    const replacement = reconcileLine({ id: "ghost", text: "ghost", agentId: "v1" });
    useProjectStore.getState().setLineWithHistory("ghost", replacement);

    expect(useProjectStore.getState().lines).toBe(linesBefore);
    expect(useProjectStore.getState().canUndo()).toBe(canUndoBefore);
  });
});

describe("project store · applyLineBackground · invariants", () => {
  it("does not mutate the input params", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);
    const params = { text: "ooh", source: "manual" as const };
    const snapshot = { ...params };

    useProjectStore.getState().applyLineBackground("L1", params);

    expect(params).toEqual(snapshot);
  });

  it("keeps unrelated lines reference-equal", () => {
    seed([
      { id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 },
      { id: "L2", text: "Other line", agentId: "v1", begin: 8, end: 12 },
    ]);
    const l2Before = getLine("L2");

    useProjectStore.getState().applyLineBackground("L1", { text: "ooh", source: "manual" });

    expect(getLine("L2")).toBe(l2Before);
  });

  it("does not mutate the input nextLine in setLineWithHistory", () => {
    seed([{ id: "L1", text: "Real line", agentId: "v1", begin: 2, end: 6 }]);
    const replacement = applyBackground(getLine("L1"), { text: "ooh", source: "manual" });
    const beforeBounds = bgBounds(replacement);

    useProjectStore.getState().setLineWithHistory("L1", replacement);

    expect(bgBounds(replacement)).toEqual(beforeBounds);
    expect(mainBounds(replacement)).toEqual({ begin: 2, end: 6 });
  });
});
