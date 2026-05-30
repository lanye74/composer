import type { RomanizationGenerator } from "@/domain/romanization/registry";
import type { WordTiming } from "@/domain/word/timing";
import { hasNonLatinScript } from "@/domain/romanization/detect";

// -- Types --------------------------------------------------------------------

type PinyinToneType = "symbol" | "num" | "none";

interface SchemeProfile {
  toneType: PinyinToneType;
}

type PinyinFn = (text: string, options: { type: "string"; toneType: PinyinToneType }) => string;

// -- Constants ----------------------------------------------------------------

// pinyin-pro ships true Pinyin but does NOT ship Wade-Giles. v1 best-effort:
// strip tone marks and surface lowercase Pinyin syllables, which is closer to
// Wade-Giles' tone-mark-free convention than nothing. A full Wade-Giles syllable
// table is out of scope and slated for a follow-up if anyone asks.
const SCHEME_PROFILES: Record<string, SchemeProfile> = {
  "zh-Latn-pinyin": { toneType: "symbol" },
  "zh-Latn-wadegiles": { toneType: "none" },
};

// -- Singleton ----------------------------------------------------------------

let pinyinFnPromise: Promise<PinyinFn> | null = null;

async function ensurePinyin(): Promise<PinyinFn> {
  if (!pinyinFnPromise) {
    pinyinFnPromise = (async () => {
      const { pinyin } = await import("pinyin-pro");
      return pinyin as PinyinFn;
    })().catch((err) => {
      pinyinFnPromise = null;
      throw err;
    });
  }
  return pinyinFnPromise;
}

// -- Factory ------------------------------------------------------------------

async function createPinyinGenerator(scheme: string): Promise<RomanizationGenerator> {
  const profile = SCHEME_PROFILES[scheme];
  if (!profile) {
    throw new Error(`Unsupported chinese romanization scheme: ${scheme}`);
  }
  const pinyin = await ensurePinyin();

  function convert(text: string): string {
    if (!text) return text;
    if (!hasNonLatinScript(text)) return text;
    const result = pinyin(text, { type: "string", toneType: profile.toneType });
    return typeof result === "string" ? result : text;
  }

  return {
    scheme,
    async generateLine(text: string) {
      return convert(text);
    },
    async generateWords(words: WordTiming[]) {
      const out: WordTiming[] = [];
      for (const word of words) {
        const converted = convert(word.text).trim();
        out.push({ ...word, text: converted || word.text });
      }
      return out;
    },
  };
}

// -- Exports ------------------------------------------------------------------

export { createPinyinGenerator };
