import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTtml } from "@/utils/lyrics-parsers/ttml";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../test/fixtures");
const readFixture = (name: string): string => readFileSync(resolve(FIXTURES_DIR, name), "utf-8");

// -- Fixtures -----------------------------------------------------------------

const UNPREFIXED_TTML = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xml:lang="ja">
  <head>
    <metadata>
      <ttm:agent type="person" xml:id="v1"/>
      <transliterations>
        <transliteration xml:lang="ja-Latn-hepburn">
          <text for="L1">
            <span begin="0:00.833" end="0:01.195">doudemo</span>
            <span begin="0:01.195" end="0:01.887">ii youna</span>
          </text>
        </transliteration>
      </transliterations>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="0:00.833" end="0:01.887" itunes:key="L1" ttm:agent="v1">
        <span begin="0:00.833" end="0:01.195">どうでも</span>
        <span begin="0:01.195" end="0:01.887">いいような</span>
      </p>
    </div>
  </body>
</tt>`;

// -- Import tests -------------------------------------------------------------

describe("TTML import · unprefixed transliterations", () => {
  it("sets metadata.romanizationScheme from <transliteration xml:lang>", () => {
    const result = parseTtml(UNPREFIXED_TTML);
    expect(result.metadata?.romanizationScheme).toBe("ja-Latn-hepburn");
  });

  it("attaches per-word romanization text to the matching <p>", () => {
    const result = parseTtml(UNPREFIXED_TTML);
    const line = result.lines[0];
    expect(line?.romanization?.text).toBe("doudemo ii youna");
    expect(line?.romanization?.wordTexts?.length).toBe(2);
    expect(line?.romanization?.wordTexts?.[0]).toBe("doudemo");
    expect(line?.romanization?.wordTexts?.[1]).toBe("ii youna");
    expect(line?.romanization?.source).toBe("generated");
  });

  it("treats imported romanization as generated (no manual signal in TTML)", () => {
    const result = parseTtml(UNPREFIXED_TTML);
    expect(result.lines[0]?.romanization?.source).toBe("generated");
  });

  it("imports a line-synced (text-only) transliteration", () => {
    const ttml = UNPREFIXED_TTML.replace(/<text for="L1">[\s\S]*?<\/text>/, '<text for="L1">doudemo ii youna</text>');
    const result = parseTtml(ttml);
    const line = result.lines[0];
    expect(line?.romanization?.text).toBe("doudemo ii youna");
    expect(line?.romanization?.wordTexts).toBeUndefined();
  });

  it("trims whitespace around line-synced transliteration text", () => {
    const ttml = UNPREFIXED_TTML.replace(
      /<text for="L1">[\s\S]*?<\/text>/,
      '<text for="L1">   doudemo ii youna   </text>',
    );
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization?.text).toBe("doudemo ii youna");
  });

  it("ignores <text for> entries that reference an unknown line key", () => {
    const ttml = UNPREFIXED_TTML.replace('for="L1"', 'for="L-unknown"');
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization).toBeUndefined();
  });

  it("silently drops unknown schemes (no scheme set, no romanization attached)", () => {
    const ttml = UNPREFIXED_TTML.replace("ja-Latn-hepburn", "ja-Latn-superfake");
    const result = parseTtml(ttml);
    expect(result.metadata?.romanizationScheme).toBeUndefined();
    expect(result.lines[0]?.romanization).toBeUndefined();
  });

  it("does not crash on a transliteration with no xml:lang", () => {
    const ttml = UNPREFIXED_TTML.replace(' xml:lang="ja-Latn-hepburn"', "");
    expect(() => parseTtml(ttml)).not.toThrow();
    const result = parseTtml(ttml);
    expect(result.metadata?.romanizationScheme).toBeUndefined();
  });

  it("does not crash on malformed begin/end attrs on a span (timing is ignored anyway)", () => {
    const ttml = UNPREFIXED_TTML.replace('begin="0:00.833" end="0:01.195">doudemo', 'begin="" end="">doudemo');
    expect(() => parseTtml(ttml)).not.toThrow();
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization).toBeDefined();
    expect(result.lines[0]?.romanization?.wordTexts?.length).toBe(2);
    expect(result.lines[0]?.romanization?.wordTexts?.[0]).toBe("doudemo");
  });

  it("handles XML-escaped characters in the for attribute", () => {
    const escapedTtml = UNPREFIXED_TTML.replace('itunes:key="L1"', 'itunes:key="L&lt;1&amp;"').replace(
      'for="L1"',
      'for="L&lt;1&amp;"',
    );
    const result = parseTtml(escapedTtml);
    expect(result.lines[0]?.romanization?.text).toBe("doudemo ii youna");
  });

  it("picks the first known scheme when multiple transliterations are present", () => {
    const multi = UNPREFIXED_TTML.replace(
      "</transliterations>",
      `<transliteration xml:lang="zh-Latn-pinyin"><text for="L1">should-be-ignored</text></transliteration></transliterations>`,
    );
    const result = parseTtml(multi);
    expect(result.metadata?.romanizationScheme).toBe("ja-Latn-hepburn");
    expect(result.lines[0]?.romanization?.text).toBe("doudemo ii youna");
  });

  it("treats an empty <text for> as no romanization (not attached)", () => {
    const ttml = UNPREFIXED_TTML.replace(/<text for="L1">[\s\S]*?<\/text>/, '<text for="L1"></text>');
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization).toBeUndefined();
  });

  it("ignores transliterations when no <p> elements have itunes:key", () => {
    const ttml = UNPREFIXED_TTML.replace(' itunes:key="L1"', "");
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization).toBeUndefined();
  });
});

// -- Apple-wrapped (iTunesMetadata) -------------------------------------------

describe("TTML import · Apple-wrapped transliterations", () => {
  it("imports romanization nested inside <iTunesMetadata>", () => {
    const ttml = readFixture("imase-night-dancer.ttml");
    const result = parseTtml(ttml);
    expect(result.metadata?.romanizationScheme).toBe("ja-Latn-hepburn");
    const linesWithRomanization = result.lines.filter((l) => l.romanization);
    expect(linesWithRomanization.length).toBe(2);
    expect(linesWithRomanization[0].romanization?.text).toBe("doudemo ii youna");
    expect(linesWithRomanization[1].romanization?.text).toBe("yume no naka");
  });

  it("works when <transliterations> is deeply nested under metadata", () => {
    const ttml = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xml:lang="ja">
  <head>
    <metadata>
      <ttm:agent type="person" xml:id="v1"/>
      <iTunesMetadata>
        <wrapperA>
          <wrapperB>
            <transliterations>
              <transliteration xml:lang="ja-Latn-hepburn">
                <text for="L1">deep nest</text>
              </transliteration>
            </transliterations>
          </wrapperB>
        </wrapperA>
      </iTunesMetadata>
    </metadata>
  </head>
  <body><div>
    <p begin="0:00.000" end="0:01.000" itunes:key="L1" ttm:agent="v1">夜</p>
  </div></body>
</tt>`;
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization?.text).toBe("deep nest");
    expect(result.metadata?.romanizationScheme).toBe("ja-Latn-hepburn");
  });
});

// -- Composer-namespaced (legacy) ---------------------------------------------

describe("TTML import · composer:-namespaced transliterations", () => {
  it("imports romanization from <composer:transliterations>", () => {
    const ttml = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xmlns:composer="https://composer.boidu.dev/ttml" xml:lang="ja">
  <head>
    <metadata>
      <ttm:agent type="person" xml:id="v1"/>
      <composer:transliterations>
        <transliteration xml:lang="ja-Latn-hepburn">
          <text for="L1">yoru</text>
        </transliteration>
      </composer:transliterations>
    </metadata>
  </head>
  <body><div>
    <p begin="0:00.000" end="0:01.000" itunes:key="L1" ttm:agent="v1">夜</p>
  </div></body>
</tt>`;
    const result = parseTtml(ttml);
    expect(result.lines[0]?.romanization?.text).toBe("yoru");
    expect(result.metadata?.romanizationScheme).toBe("ja-Latn-hepburn");
  });
});

// -- v2 wordTexts import ------------------------------------------------------

const V2_TWO_WORD_TTML = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xml:lang="ja">
  <head>
    <metadata>
      <ttm:agent type="person" xml:id="v1"/>
      <transliterations>
        <transliteration xml:lang="ja-Latn-hepburn">
          <text for="L1">
            <span begin="0:00.500" end="0:01.000">yoru</span>
            <span begin="0:01.000" end="0:01.800">dakedo</span>
          </text>
        </transliteration>
      </transliterations>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="0:00.500" end="0:01.800" itunes:key="L1" ttm:agent="v1">
        <span begin="0:00.500" end="0:01.000">夜</span>
        <span begin="0:01.000" end="0:01.800">だけど</span>
      </p>
    </div>
  </body>
</tt>`;

describe("TTML import · v2 wordTexts import", () => {
  describe("extracts wordTexts", () => {
    it("extracts wordTexts from transliteration spans when count matches source line.words", () => {
      const result = parseTtml(V2_TWO_WORD_TTML);
      const line = result.lines[0];
      expect(line?.romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
      expect(line?.romanization?.text).toBe("yoru dakedo");
      expect(line?.romanization?.source).toBe("generated");
    });
  });

  describe("drops span timing", () => {
    it("drops the begin/end timing from transliteration spans (timing lives on line.words)", () => {
      const absurd = V2_TWO_WORD_TTML.replace(
        '<span begin="0:00.500" end="0:01.000">yoru</span>',
        '<span begin="9999:00.000" end="9999:01.000">yoru</span>',
      ).replace(
        '<span begin="0:01.000" end="0:01.800">dakedo</span>',
        '<span begin="9999:01.000" end="9999:02.000">dakedo</span>',
      );
      const result = parseTtml(absurd);
      const romanization = result.lines[0]?.romanization;
      expect(romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
      expect((romanization as { words?: unknown } | undefined)?.words).toBeUndefined();
      expect(result.lines[0]?.words?.[0].begin).toBeCloseTo(0.5, 3);
      expect(result.lines[0]?.words?.[1].end).toBeCloseTo(1.8, 3);
    });
  });

  describe("mismatched span count", () => {
    it("falls back to line-level text when source line has no words (line-synced)", () => {
      const ttml = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xml:lang="ja">
  <head>
    <metadata>
      <ttm:agent type="person" xml:id="v1"/>
      <transliterations>
        <transliteration xml:lang="ja-Latn-hepburn">
          <text for="L1">
            <span begin="0:00.000" end="0:00.500">yoru</span>
            <span begin="0:00.500" end="0:01.000">dakedo</span>
          </text>
        </transliteration>
      </transliterations>
    </metadata>
  </head>
  <body><div>
    <p begin="0:00.000" end="0:01.000" itunes:key="L1" ttm:agent="v1">夜だけど</p>
  </div></body>
</tt>`;
      const result = parseTtml(ttml);
      const line = result.lines[0];
      expect(line?.romanization?.wordTexts).toBeUndefined();
      expect(line?.romanization?.text).toBe("yoru dakedo");
    });

    it("falls back to line-level text when span count !== line.words count", () => {
      const ttml = V2_TWO_WORD_TTML.replace(
        '<span begin="0:01.000" end="0:01.800">dakedo</span>',
        '<span begin="0:01.000" end="0:01.400">da</span><span begin="0:01.400" end="0:01.800">kedo</span>',
      );
      const result = parseTtml(ttml);
      const line = result.lines[0];
      expect(line?.romanization?.wordTexts).toBeUndefined();
      expect(line?.romanization?.text).toBe("yoru da kedo");
    });
  });

  describe("edge cases", () => {
    it("preserves transliteration <text for=L1>plain text</text> as line-level text-only", () => {
      const ttml = V2_TWO_WORD_TTML.replace(/<text for="L1">[\s\S]*?<\/text>/, '<text for="L1">yoru dakedo</text>');
      const result = parseTtml(ttml);
      const romanization = result.lines[0]?.romanization;
      expect(romanization?.text).toBe("yoru dakedo");
      expect(romanization?.wordTexts).toBeUndefined();
      expect((romanization as { words?: unknown } | undefined)?.words).toBeUndefined();
    });

    it("handles XML-escaped characters in span text correctly", () => {
      const ttml = V2_TWO_WORD_TTML.replace(">yoru<", ">yoru &amp; co<");
      const result = parseTtml(ttml);
      expect(result.lines[0]?.romanization?.wordTexts?.[0]).toBe("yoru & co");
    });

    it("v2 round-trip: emit then re-parse preserves wordTexts and source-line timing", () => {
      const parsed1 = parseTtml(V2_TWO_WORD_TTML);
      const line = parsed1.lines[0];
      expect(line?.romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
      expect((line?.romanization as { words?: unknown } | undefined)?.words).toBeUndefined();
      expect(line?.words?.length).toBe(2);
      expect(line?.words?.[0].begin).toBeCloseTo(0.5, 3);
      expect(line?.words?.[1].end).toBeCloseTo(1.8, 3);
    });
  });
});
