/**
 * @vitest-environment node
 */
import { setBackground } from "@/domain/line/background";
import { bgBounds, mainBounds } from "@/domain/line/bounds";
import { type LyricLine, reconcileLine } from "@/domain/line/model";
import { isLineSynced as isLineSyncedVoice, isWordSynced as isWordSyncedVoice } from "@/domain/voice/predicates";
import { bgSource, bgText, bgVoice, bgWords, mainWords } from "@/domain/line/voices";
import { shiftLineBy } from "@/domain/line/shift-timing";
import { describe, expect, it } from "vitest";

const wordSyncedMain = (): LyricLine =>
  reconcileLine({
    id: "l",
    agentId: "v1",
    text: "hi there",
    words: [
      { text: "hi ", begin: 10, end: 10.5 },
      { text: "there", begin: 10.5, end: 11 },
    ],
  });

describe("shiftLineBy · main", () => {
  it("shifts a word-synced main and preserves word metadata", () => {
    const line = reconcileLine({
      id: "l",
      agentId: "v1",
      text: "hi",
      words: [{ text: "hi", begin: 10, end: 11, explicit: true }],
    });
    const shifted = shiftLineBy(line, 5);
    expect(mainWords(shifted)).toEqual([{ text: "hi", begin: 15, end: 16, explicit: true }]);
  });

  it("shifts a line-synced main", () => {
    const line = reconcileLine({ id: "l", agentId: "v1", text: "hi", begin: 10, end: 12 });
    const shifted = shiftLineBy(line, -3);
    expect(mainBounds(shifted)).toEqual({ begin: 7, end: 9 });
  });

  it("leaves an untimed main unchanged", () => {
    const line = reconcileLine({ id: "l", agentId: "v1", text: "hi" });
    const shifted = shiftLineBy(line, 5);
    expect(mainBounds(shifted)).toBeNull();
    expect(shifted.main).toEqual({ text: "hi" });
  });
});

describe("shiftLineBy · background", () => {
  it("shifts a line-synced background and preserves its text and source", () => {
    const line = setBackground(wordSyncedMain(), { text: "ooh", begin: 10, end: 11, source: "manual" });
    const shifted = shiftLineBy(line, 4);
    expect(bgWords(shifted)).toBeUndefined();
    expect(bgBounds(shifted)).toEqual({ begin: 14, end: 15 });
    expect(bgText(shifted)).toBe("ooh");
    expect(bgSource(shifted)).toBe("manual");
    const shiftedBg = bgVoice(shifted);
    expect(shiftedBg && isLineSyncedVoice(shiftedBg)).toBe(true);
  });

  it("shifts a word-synced background", () => {
    const line = reconcileLine({
      id: "l",
      agentId: "v1",
      text: "hi",
      words: [{ text: "hi", begin: 10, end: 11 }],
      backgroundText: "ooh",
      backgroundWords: [{ text: "ooh", begin: 10, end: 10.5 }],
      backgroundTextSource: "extraction",
    });
    const shifted = shiftLineBy(line, 2);
    expect(bgWords(shifted)).toEqual([{ text: "ooh", begin: 12, end: 12.5 }]);
    expect(bgSource(shifted)).toBe("extraction");
    const shiftedBg = bgVoice(shifted);
    expect(shiftedBg && isWordSyncedVoice(shiftedBg)).toBe(true);
  });

  it("leaves an untimed background's text intact", () => {
    const line = reconcileLine({ id: "l", agentId: "v1", text: "hi", backgroundText: "ooh" });
    const shifted = shiftLineBy(line, 5);
    expect(bgText(shifted)).toBe("ooh");
    expect(bgBounds(shifted)).toBeNull();
  });
});

describe("shiftLineBy · invariants", () => {
  it("does not mutate the input line", () => {
    const line = setBackground(wordSyncedMain(), { text: "ooh", begin: 10, end: 11, source: "manual" });
    const before = JSON.parse(JSON.stringify(line));
    shiftLineBy(line, 7);
    expect(line).toEqual(before);
  });

  it("a zero shift is a value-equal no-op", () => {
    const line = setBackground(wordSyncedMain(), { text: "ooh", begin: 10, end: 11, source: "manual" });
    expect(shiftLineBy(line, 0)).toEqual(line);
  });
});
