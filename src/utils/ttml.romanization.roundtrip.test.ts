import { describe, expect, it } from "vitest";
import { generateTTML } from "@/utils/ttml";
import { parseLyricsFile } from "@/utils/lyrics-parsers";
import { reconcileLine, type LyricLine } from "@/domain/line/model";
import type { Agent } from "@/domain/agent/model";
import type { ProjectMetadata } from "@/domain/project/metadata";

const agents: Agent[] = [{ id: "v1", type: "person", name: "Lead" }];
const baseMeta: ProjectMetadata = {
  title: "Song",
  artist: "Artist",
  album: "Album",
  duration: 10,
  romanizationScheme: "ja-Latn-hepburn",
};

function makeLines(): LyricLine[] {
  return [
    reconcileLine({
      id: "raw-1",
      text: "夜だけど",
      agentId: "v1",
      words: [
        { text: "夜", begin: 0.5, end: 1.0 },
        { text: "だけど", begin: 1.0, end: 1.8 },
      ],
      romanization: {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "manual",
      },
    }),
    reconcileLine({
      id: "raw-2",
      text: "夢の中",
      agentId: "v1",
      begin: 2.0,
      end: 3.5,
      romanization: { text: "yume no naka", source: "manual" },
    }),
  ];
}

describe("TTML romanization round-trip", () => {
  it("preserves text, wordTexts, source, and project scheme", () => {
    const ttml = generateTTML({
      metadata: baseMeta,
      agents,
      lines: makeLines(),
      granularity: "word",
    });
    const result = parseLyricsFile("song.ttml", ttml);
    expect(result.metadata.romanizationScheme).toBe("ja-Latn-hepburn");
    expect(result.lines[0].romanization?.text).toBe("yoru dakedo");
    expect(result.lines[0].romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
    expect(result.lines[0].romanization?.source).toBe("manual");
    expect(result.lines[1].romanization?.text).toBe("yume no naka");
    expect(result.lines[1].romanization?.wordTexts).toBeUndefined();
  });

  it("re-emits byte-identical TTML after one round-trip (minified, agent included)", () => {
    const lines = makeLines();
    const first = generateTTML({
      metadata: baseMeta,
      agents,
      lines,
      granularity: "word",
      minify: true,
    });
    const result = parseLyricsFile("song.ttml", first);

    const reEmittedLines = result.lines.map((line, idx) => {
      const original = lines[idx];
      return reconcileLine({ ...line, id: original.id });
    });

    const second = generateTTML({
      metadata: { ...baseMeta, ...result.metadata },
      agents,
      lines: reEmittedLines,
      granularity: "word",
      minify: true,
    });
    expect(second).toBe(first);
  });

  it("preserves source word timing through round-trip (not romanization-side timing)", () => {
    const ttml = generateTTML({
      metadata: baseMeta,
      agents,
      lines: makeLines(),
      granularity: "word",
    });
    const result = parseLyricsFile("song.ttml", ttml);
    const first = result.lines[0];
    expect(first.words?.[0].begin).toBeCloseTo(0.5, 3);
    expect(first.words?.[0].end).toBeCloseTo(1.0, 3);
    expect(first.words?.[1].begin).toBeCloseTo(1.0, 3);
    expect(first.words?.[1].end).toBeCloseTo(1.8, 3);
  });

  it("drops wordTexts on import when the source line's word count differs from the transliteration's span count", () => {
    const lines: LyricLine[] = [
      reconcileLine({
        id: "raw-3",
        text: "夜だけど",
        agentId: "v1",
        words: [
          { text: "夜", begin: 0.5, end: 1.0 },
          { text: "だけど", begin: 1.0, end: 1.8 },
        ],
        romanization: {
          text: "yoru dakedo",
          wordTexts: ["yoru", "dakedo"],
          source: "manual",
        },
      }),
    ];
    const ttml = generateTTML({
      metadata: baseMeta,
      agents,
      lines,
      granularity: "word",
      minify: true,
    });

    const corrupted = ttml.replace(
      /<span begin="0:00\.500" end="0:01\.000">yoru<\/span><span begin="0:01\.000" end="0:01\.800">dakedo<\/span>/,
      '<span begin="0:00.500" end="0:01.800">yorudakedo</span>',
    );
    expect(corrupted).not.toBe(ttml);

    const result = parseLyricsFile("song.ttml", corrupted);
    expect(result.lines[0].romanization?.text).toBe("yorudakedo");
    expect(result.lines[0].romanization?.wordTexts).toBeUndefined();
  });

  it("emits no <transliteration> for a line whose romanization.text is empty", () => {
    const lines = [
      reconcileLine({
        id: "raw-4",
        text: "夜",
        agentId: "v1",
        begin: 0,
        end: 1,
        romanization: { text: "", source: "manual" },
      }),
    ];
    const ttml = generateTTML({ metadata: baseMeta, agents, lines, granularity: "word" });
    expect(ttml).not.toContain("<transliteration");
    const result = parseLyricsFile("song.ttml", ttml);
    expect(result.lines[0].romanization).toBeUndefined();
  });

  it("does not emit a transliteration for an untimed line even if it has romanization", () => {
    const lines = [
      reconcileLine({
        id: "raw-5",
        text: "夜",
        agentId: "v1",
        romanization: { text: "yoru", source: "manual" },
      }),
      reconcileLine({
        id: "raw-6",
        text: "夢",
        agentId: "v1",
        begin: 0,
        end: 1,
        romanization: { text: "yume", source: "manual" },
      }),
    ];
    const ttml = generateTTML({ metadata: baseMeta, agents, lines, granularity: "word" });
    expect(ttml).toMatch(/<transliteration for="L1"/);
    expect(ttml).not.toMatch(/<transliteration for="L2"/);
    const result = parseLyricsFile("song.ttml", ttml);
    expect(result.lines.find((l) => l.text === "夢")?.romanization?.text).toBe("yume");
  });
});
