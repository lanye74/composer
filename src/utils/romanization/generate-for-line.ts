import type { LyricLine, RomanizationData } from "@/domain/line/model";
import { getGeneratorFactory, type RomanizationGenerator } from "@/domain/romanization/registry";

// -- Internal -----------------------------------------------------------------

const generatorCache = new Map<string, Promise<RomanizationGenerator>>();

async function loadGenerator(scheme: string): Promise<RomanizationGenerator> {
  const cached = generatorCache.get(scheme);
  if (cached) return cached;
  const factory = getGeneratorFactory(scheme);
  if (!factory) {
    throw new Error(`No romanization generator registered for scheme: ${scheme}`);
  }
  const promise = factory().catch((err) => {
    generatorCache.delete(scheme);
    throw err;
  });
  generatorCache.set(scheme, promise);
  return promise;
}

// -- Public API ---------------------------------------------------------------

async function generateForLine(line: LyricLine, scheme: string): Promise<RomanizationData> {
  const generator = await loadGenerator(scheme);

  if (line.words !== undefined) {
    const words = await generator.generateWords(line.words);
    const text = words.map((word) => word.text).join(" ");
    return { text, words, source: "generated" };
  }

  const text = await generator.generateLine(line.text);
  return { text, source: "generated" };
}

function clearGeneratorCacheForTests(): void {
  generatorCache.clear();
}

// -- Exports ------------------------------------------------------------------

export { clearGeneratorCacheForTests, generateForLine };
