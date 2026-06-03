import { describe, expect, it, vi } from "vitest";
import { parseLyricsFile } from "@/utils/lyrics-parsers";

const headHeader = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal"><head><metadata><ttm:agent type="person" xml:id="v1"/>`;
const headerNoMetadata = "</metadata></head><body><div>";
const footer = "</div></body></tt>";

function build(transliterations: string, paragraphs: string): string {
  return `${headHeader}${transliterations}${headerNoMetadata}${paragraphs}${footer}`;
}

describe("parseLyricsFile - TTML import of word-aligned romanization", () => {
  it("attaches wordTexts to the matching word-synced line via itunes:key=L1", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1"><span begin="00:00.500" end="00:01.000">yoru</span> <span begin="00:01.000" end="00:01.800">dakedo</span></text></transliteration>`,
      `<p begin="00:00.500" end="00:01.800" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span><span begin="00:01.000" end="00:01.800">だけど</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    const line = result.lines[0];
    expect(line.romanization?.text).toBe("yoru dakedo");
    expect(line.romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
    expect(line.romanization?.source).toBe("manual");
    expect(result.metadata.romanizationScheme).toBe("ja-Latn-hepburn");
  });
});

describe("parseLyricsFile - TTML import of line-level romanization", () => {
  it("attaches a line-level text to a line-synced line", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1">yume no naka</text></transliteration>`,
      `<p begin="00:02.000" end="00:03.500" ttm:agent="v1" itunes:key="L1">夢の中</p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    const line = result.lines[0];
    expect(line.romanization?.text).toBe("yume no naka");
    expect(line.romanization?.wordTexts).toBeUndefined();
  });
});

describe("parseLyricsFile - TTML import fallback to outer for=", () => {
  it("reads for= from outer <transliteration> when inner <text> has none (better-lyrics style)", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text><span begin="00:00.500" end="00:01.000">yoru</span></text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization?.wordTexts).toEqual(["yoru"]);
  });
});

describe("parseLyricsFile - TTML import arity mismatch", () => {
  it("drops wordTexts and keeps line-level text when count mismatches", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1"><span begin="00:00.500" end="00:01.500">yorudakedo</span></text></transliteration>`,
      `<p begin="00:00.500" end="00:01.800" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span><span begin="00:01.000" end="00:01.800">だけど</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization?.text).toBe("yorudakedo");
    expect(result.lines[0].romanization?.wordTexts).toBeUndefined();
  });
});

describe("parseLyricsFile - TTML import multi-scheme conflict", () => {
  it("locks the project scheme to the first <transliteration> encountered, warns on conflict, ignores conflicting blocks", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1">yoru</text></transliteration><transliteration for="L2" xml:lang="ja-Latn-nihon"><text for="L2">yoru2</text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span></p><p begin="00:01.500" end="00:02.000" ttm:agent="v1" itunes:key="L2"><span begin="00:01.500" end="00:02.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.metadata.romanizationScheme).toBe("ja-Latn-hepburn");
    expect(result.lines[0].romanization?.text).toBe("yoru");
    expect(result.lines[1].romanization).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("parseLyricsFile - TTML import missing key", () => {
  it("skips transliteration blocks that target an unknown itunes:key", () => {
    const content = build(
      `<transliteration for="L99" xml:lang="ja-Latn-hepburn"><text for="L99">stray</text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization).toBeUndefined();
  });
});

describe("parseLyricsFile - TTML import legacy dual-emit", () => {
  it("collapses two adjacent transliteration blocks for the same line into one (last writer wins)", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1">first</text></transliteration><transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1">second</text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization?.text).toBe("second");
  });
});

describe("parseLyricsFile - TTML import resilience", () => {
  it("tolerates a transliteration block with empty inner text", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1"></text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization?.text).toBe("");
  });

  it("ignores a transliteration with no for on either outer or inner", () => {
    const content = build(
      `<transliteration xml:lang="ja-Latn-hepburn"><text>orphan</text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1" itunes:key="L1"><span begin="00:00.500" end="00:01.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization).toBeUndefined();
    expect(result.metadata.romanizationScheme).toBe("ja-Latn-hepburn");
  });

  it("imports correctly when itunes:key is missing on <p> (no romanization possible)", () => {
    const content = build(
      `<transliteration for="L1" xml:lang="ja-Latn-hepburn"><text for="L1">yoru</text></transliteration>`,
      `<p begin="00:00.500" end="00:01.000" ttm:agent="v1"><span begin="00:00.500" end="00:01.000">夜</span></p>`,
    );
    const result = parseLyricsFile("song.ttml", content);
    expect(result.lines[0].romanization).toBeUndefined();
  });
});
