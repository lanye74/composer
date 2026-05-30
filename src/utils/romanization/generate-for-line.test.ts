import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LyricLine, RomanizationData } from "@/domain/line/model";
import type { RomanizationGenerator } from "@/domain/romanization/registry";
import {
  clearGeneratorRegistry,
  registerGeneratorFactory,
  restoreGeneratorRegistry,
  snapshotGeneratorRegistry,
} from "@/domain/romanization/registry";
import type { WordTiming } from "@/domain/word/timing";
import { clearGeneratorCacheForTests, generateForLine } from "@/utils/romanization/generate-for-line";

// -- Helpers ------------------------------------------------------------------

function makeStubGenerator(scheme: string): RomanizationGenerator {
  return {
    scheme,
    async generateLine(text: string) {
      return text.split("").reverse().join("");
    },
    async generateWords(words: WordTiming[]) {
      return words.map((word) => ({ ...word, text: word.text.split("").reverse().join("") }));
    },
  };
}

let originalSnapshot: ReturnType<typeof snapshotGeneratorRegistry>;

beforeAll(() => {
  originalSnapshot = snapshotGeneratorRegistry();
});

beforeEach(() => {
  clearGeneratorCacheForTests();
  clearGeneratorRegistry();
  registerGeneratorFactory("zz-Latn-test", async () => makeStubGenerator("zz-Latn-test"));
});

afterEach(() => {
  restoreGeneratorRegistry(originalSnapshot);
});

// -- Tests --------------------------------------------------------------------

describe("generateForLine", () => {
  it("returns word-by-word romanization 1:1 with line.words and preserves timing", async () => {
    const line: LyricLine = {
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だけど", begin: 1, end: 2 },
      ],
    };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.source).toBe("generated");
    expect(result.words?.length).toBe(2);
    expect(result.words?.[0].text).toBe("夜".split("").reverse().join(""));
    expect(result.words?.[0].begin).toBe(0);
    expect(result.words?.[0].end).toBe(1);
    expect(result.words?.[1].begin).toBe(1);
    expect(result.words?.[1].end).toBe(2);
  });

  it("returns text-only romanization for a line-synced line", async () => {
    const line: LyricLine = {
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      begin: 0,
      end: 2,
    };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.source).toBe("generated");
    expect(result.words).toBeUndefined();
    expect(result.text).toBe("夜だけど".split("").reverse().join(""));
  });

  it("returns text-only romanization for an untimed line", async () => {
    const line: LyricLine = { id: "L1", text: "hello", agentId: "v1" };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.words).toBeUndefined();
    expect(result.text).toBe("olleh");
  });

  it("returns empty text for an empty line", async () => {
    const line: LyricLine = { id: "L1", text: "", agentId: "v1" };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.text).toBe("");
    expect(result.words).toBeUndefined();
  });

  it("returns an empty words array when the source has an empty words array", async () => {
    const line: LyricLine = { id: "L1", text: "夜", agentId: "v1", words: [] };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.words).toEqual([]);
    expect(result.text).toBe("");
  });

  it("composes the line-level text from generated word texts joined by spaces when words exist", async () => {
    const line: LyricLine = {
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だけど", begin: 1, end: 2 },
      ],
    };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.text).toBe(`${"夜".split("").reverse().join("")} ${"だけど".split("").reverse().join("")}`);
  });

  it("throws a typed error when the scheme has no registered generator", async () => {
    const line: LyricLine = { id: "L1", text: "夜", agentId: "v1" };
    await expect(generateForLine(line, "zz-Latn-missing")).rejects.toThrow(/zz-Latn-missing/);
  });

  it("preserves word metadata fields produced by the generator", async () => {
    const customGenerator: RomanizationGenerator = {
      scheme: "zz-Latn-test",
      async generateLine(text) {
        return text;
      },
      async generateWords(words) {
        return words.map((word) => ({ ...word, text: word.text, explicit: true }));
      },
    };
    clearGeneratorRegistry();
    clearGeneratorCacheForTests();
    registerGeneratorFactory("zz-Latn-test", async () => customGenerator);

    const line: LyricLine = {
      id: "L1",
      text: "夜",
      agentId: "v1",
      words: [{ text: "夜", begin: 0, end: 1, syllableGroupId: "g1" }],
    };
    const result = await generateForLine(line, "zz-Latn-test");
    expect(result.words?.[0].syllableGroupId).toBe("g1");
    expect(result.words?.[0].explicit).toBe(true);
  });

  it("returns RomanizationData typed with source: 'generated'", async () => {
    const line: LyricLine = { id: "L1", text: "夜", agentId: "v1" };
    const result: RomanizationData = await generateForLine(line, "zz-Latn-test");
    expect(result.source).toBe("generated");
  });
});
