import { describe, expect, it } from "vitest";
import { createPinyinGenerator } from "@/utils/romanization/pinyin-generator";

// -- Tests --------------------------------------------------------------------

describe("pinyinGenerator (Pinyin)", () => {
  it("exposes the requested scheme", async () => {
    const generator = await createPinyinGenerator("zh-Latn-pinyin");
    expect(generator.scheme).toBe("zh-Latn-pinyin");
  });

  it("generates Pinyin with tone marks by default", async () => {
    const generator = await createPinyinGenerator("zh-Latn-pinyin");
    const result = await generator.generateLine("你好");
    expect(typeof result).toBe("string");
    expect(result.toLowerCase()).toContain("nǐ");
  });

  it("returns Latin input unchanged", async () => {
    const generator = await createPinyinGenerator("zh-Latn-pinyin");
    const result = await generator.generateLine("hello world");
    expect(result).toBe("hello world");
  });

  it("returns empty string for empty input", async () => {
    const generator = await createPinyinGenerator("zh-Latn-pinyin");
    expect(await generator.generateLine("")).toBe("");
  });

  it("generateWords preserves input length and timing exactly", async () => {
    const generator = await createPinyinGenerator("zh-Latn-pinyin");
    const words = [
      { text: "你", begin: 0.1, end: 0.5 },
      { text: "好", begin: 0.5, end: 1 },
    ];
    const result = await generator.generateWords(words);
    expect(result.length).toBe(words.length);
    expect(result[0].begin).toBe(0.1);
    expect(result[0].end).toBe(0.5);
    expect(result[1].begin).toBe(0.5);
    expect(result[1].end).toBe(1);
    expect(result[0].text.toLowerCase()).toContain("nǐ");
    expect(result[1].text.toLowerCase()).toContain("hǎo");
  });

  it("generateWords preserves explicit and syllableGroupId metadata", async () => {
    const generator = await createPinyinGenerator("zh-Latn-pinyin");
    const result = await generator.generateWords([
      { text: "你", begin: 0, end: 1, explicit: true, syllableGroupId: "g1" },
    ]);
    expect(result[0].explicit).toBe(true);
    expect(result[0].syllableGroupId).toBe("g1");
  });
});

describe("pinyinGenerator (Wade-Giles)", () => {
  it("returns plain Latin output without tone marks for the Wade-Giles best-effort scheme", async () => {
    const generator = await createPinyinGenerator("zh-Latn-wadegiles");
    expect(generator.scheme).toBe("zh-Latn-wadegiles");
    const result = await generator.generateLine("你好");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(result)).toBe(false);
  });
});

describe("pinyinGenerator (errors)", () => {
  it("rejects an unknown chinese scheme", async () => {
    await expect(createPinyinGenerator("zh-Latn-bogus")).rejects.toThrow(/scheme/i);
  });
});
