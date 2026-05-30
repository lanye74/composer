import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RomanizationGenerator } from "@/domain/romanization/registry";
import {
  clearGeneratorRegistry,
  registerGeneratorFactory,
  restoreGeneratorRegistry,
  snapshotGeneratorRegistry,
} from "@/domain/romanization/registry";
import type { WordTiming } from "@/domain/word/timing";
import { useProjectStore } from "@/stores/project";
import { clearGeneratorCacheForTests } from "@/utils/romanization/generate-for-line";
import { generateForProject } from "@/utils/romanization/generate-for-project";

// -- Helpers ------------------------------------------------------------------

function makeReverseGenerator(scheme: string): RomanizationGenerator {
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
  useProjectStore.getState().reset();
  useProjectStore.getState().clearHistory();
  clearGeneratorCacheForTests();
  clearGeneratorRegistry();
  registerGeneratorFactory("ja-Latn-hepburn", async () => makeReverseGenerator("ja-Latn-hepburn"));
});

afterEach(() => {
  restoreGeneratorRegistry(originalSnapshot);
});

// -- Tests --------------------------------------------------------------------

describe("generateForProject", () => {
  it("generates romanization for every non-Latin japanese line in the project", async () => {
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜だけど", agentId: "v1" },
      { id: "L2", text: "hello", agentId: "v1" },
      { id: "L3", text: "メモリー", agentId: "v1" },
    ]);

    const result = await generateForProject({ scheme: "ja-Latn-hepburn" });
    expect(result.total).toBe(2);
    expect(result.done).toBe(2);
    expect(result.errors).toEqual([]);
    expect(result.aborted).toBe(false);

    const lines = useProjectStore.getState().lines;
    expect(lines.find((l) => l.id === "L1")?.romanization?.text).toBe("どけだ夜");
    expect(lines.find((l) => l.id === "L2")?.romanization).toBeUndefined();
    expect(lines.find((l) => l.id === "L3")?.romanization?.text).toBe("ーリモメ");
  });

  it("skips lines whose script does not match the scheme", async () => {
    registerGeneratorFactory("zh-Latn-pinyin", async () => makeReverseGenerator("zh-Latn-pinyin"));
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜だけど", agentId: "v1" },
      { id: "L2", text: "你好", agentId: "v1" },
    ]);

    const result = await generateForProject({ scheme: "zh-Latn-pinyin" });
    expect(result.total).toBe(1);
    const lines = useProjectStore.getState().lines;
    expect(lines.find((l) => l.id === "L1")?.romanization).toBeUndefined();
    expect(lines.find((l) => l.id === "L2")?.romanization?.text).toBe("好你");
  });

  it("preserves manual romanization and overwrites generated romanization", async () => {
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜だけど", agentId: "v1" },
      { id: "L2", text: "メモリー", agentId: "v1" },
    ]);
    useProjectStore.getState().setLineRomanization("L1", { text: "MANUAL", source: "manual" });
    useProjectStore.getState().setLineRomanization("L2", { text: "STALE", source: "generated" });

    await generateForProject({ scheme: "ja-Latn-hepburn" });

    const lines = useProjectStore.getState().lines;
    expect(lines.find((l) => l.id === "L1")?.romanization?.text).toBe("MANUAL");
    expect(lines.find((l) => l.id === "L1")?.romanization?.source).toBe("manual");
    expect(lines.find((l) => l.id === "L2")?.romanization?.text).toBe("ーリモメ");
    expect(lines.find((l) => l.id === "L2")?.romanization?.source).toBe("generated");
  });

  it("emits monotonic progress callbacks", async () => {
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜だ", agentId: "v1" },
      { id: "L2", text: "メモリー", agentId: "v1" },
      { id: "L3", text: "だけど", agentId: "v1" },
    ]);

    const progress: Array<{ done: number; total: number }> = [];
    await generateForProject({
      scheme: "ja-Latn-hepburn",
      onProgress: (done, total) => progress.push({ done, total }),
    });

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toEqual({ done: 3, total: 3 });
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i].done).toBeGreaterThanOrEqual(progress[i - 1].done);
      expect(progress[i].total).toBe(progress[0].total);
    }
  });

  it("writes one history entry that undo restores", () => {
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜", agentId: "v1" },
      { id: "L2", text: "だけど", agentId: "v1" },
    ]);
    useProjectStore.getState().clearHistory();
    const before = useProjectStore.getState().lines;

    return generateForProject({ scheme: "ja-Latn-hepburn" }).then(() => {
      expect(useProjectStore.getState().canUndo()).toBe(true);
      useProjectStore.getState().undo();
      const after = useProjectStore.getState().lines;
      expect(after.find((l) => l.id === "L1")?.romanization).toBeUndefined();
      expect(after.find((l) => l.id === "L2")?.romanization).toBeUndefined();
      expect(after).toEqual(before);
    });
  });

  it("collects per-line generator errors without aborting the batch", async () => {
    const flakyGenerator: RomanizationGenerator = {
      scheme: "ja-Latn-hepburn",
      async generateLine(text: string) {
        if (text.includes("X")) throw new Error("simulated failure");
        return text.split("").reverse().join("");
      },
      async generateWords(words: WordTiming[]) {
        return words.map((word) => ({ ...word, text: word.text.split("").reverse().join("") }));
      },
    };
    clearGeneratorRegistry();
    clearGeneratorCacheForTests();
    registerGeneratorFactory("ja-Latn-hepburn", async () => flakyGenerator);
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜だ", agentId: "v1" },
      { id: "L2", text: "メモリーX", agentId: "v1" },
      { id: "L3", text: "だけど", agentId: "v1" },
    ]);

    const result = await generateForProject({ scheme: "ja-Latn-hepburn" });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].lineId).toBe("L2");
    expect(result.errors[0].message).toContain("simulated failure");
    expect(result.done).toBe(2);

    const lines = useProjectStore.getState().lines;
    expect(lines.find((l) => l.id === "L1")?.romanization?.text).toBe("だ夜");
    expect(lines.find((l) => l.id === "L2")?.romanization).toBeUndefined();
    expect(lines.find((l) => l.id === "L3")?.romanization?.text).toBe("どけだ");
  });

  it("emits a progress callback for each failed line", async () => {
    const flakyGenerator: RomanizationGenerator = {
      scheme: "ja-Latn-hepburn",
      async generateLine(text: string) {
        if (text.includes("X")) throw new Error("simulated failure");
        return text.split("").reverse().join("");
      },
      async generateWords(words: WordTiming[]) {
        return words.map((word) => ({ ...word, text: word.text.split("").reverse().join("") }));
      },
    };
    clearGeneratorRegistry();
    clearGeneratorCacheForTests();
    registerGeneratorFactory("ja-Latn-hepburn", async () => flakyGenerator);
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜だ", agentId: "v1" },
      { id: "L2", text: "メモリーX", agentId: "v1" },
      { id: "L3", text: "だけどX", agentId: "v1" },
      { id: "L4", text: "メモリー", agentId: "v1" },
    ]);

    const progress: Array<{ done: number; total: number }> = [];
    const result = await generateForProject({
      scheme: "ja-Latn-hepburn",
      onProgress: (done, total) => progress.push({ done, total }),
    });

    expect(result.total).toBe(4);
    expect(result.done).toBe(2);
    expect(result.errors.length).toBe(2);

    const tickCalls = progress.filter((p) => p !== progress[0]);
    expect(tickCalls.length).toBe(result.total);
    expect(progress[progress.length - 1]).toEqual({ done: 2, total: 4 });
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i].done).toBeGreaterThanOrEqual(progress[i - 1].done);
      expect(progress[i].total).toBe(progress[0].total);
    }
  });

  it("aborts cleanly and restores the pre-run baseline", async () => {
    useProjectStore.getState().setLines([
      { id: "L1", text: "夜", agentId: "v1" },
      { id: "L2", text: "だけど", agentId: "v1" },
      { id: "L3", text: "メモリー", agentId: "v1" },
    ]);
    useProjectStore.getState().clearHistory();
    const beforeLines = useProjectStore.getState().lines;

    const controller = new AbortController();
    const blockingGenerator: RomanizationGenerator = {
      scheme: "ja-Latn-hepburn",
      async generateLine(text: string) {
        controller.abort();
        return text;
      },
      async generateWords(words: WordTiming[]) {
        controller.abort();
        return words;
      },
    };
    clearGeneratorRegistry();
    clearGeneratorCacheForTests();
    registerGeneratorFactory("ja-Latn-hepburn", async () => blockingGenerator);

    const result = await generateForProject({ scheme: "ja-Latn-hepburn", signal: controller.signal });
    expect(result.aborted).toBe(true);

    const afterLines = useProjectStore.getState().lines;
    expect(afterLines).toEqual(beforeLines);
    expect(useProjectStore.getState().canUndo()).toBe(false);
  });

  it("treats an empty project as a no-op", async () => {
    const result = await generateForProject({ scheme: "ja-Latn-hepburn" });
    expect(result.total).toBe(0);
    expect(result.done).toBe(0);
    expect(result.errors).toEqual([]);
    expect(useProjectStore.getState().canUndo()).toBe(false);
  });

  it("throws when the scheme has no registered generator", async () => {
    useProjectStore.getState().setLines([{ id: "L1", text: "夜", agentId: "v1" }]);
    await expect(generateForProject({ scheme: "zz-Latn-missing" })).rejects.toThrow();
  });

  it("preserves word timing when generating word-synced lines", async () => {
    useProjectStore.getState().setLines([
      {
        id: "L1",
        text: "夜だけど",
        agentId: "v1",
        words: [
          { text: "夜", begin: 0, end: 1 },
          { text: "だけど", begin: 1, end: 2 },
        ],
      },
    ]);

    await generateForProject({ scheme: "ja-Latn-hepburn" });

    const line = useProjectStore.getState().lines[0];
    expect(line.romanization?.words?.length).toBe(2);
    expect(line.romanization?.words?.[0].begin).toBe(0);
    expect(line.romanization?.words?.[0].end).toBe(1);
    expect(line.romanization?.words?.[1].begin).toBe(1);
    expect(line.romanization?.words?.[1].end).toBe(2);
  });

  it("a bulk run does not push a history entry when nothing matched the script", async () => {
    useProjectStore.getState().setLines([{ id: "L1", text: "hello", agentId: "v1" }]);
    useProjectStore.getState().clearHistory();

    await generateForProject({ scheme: "ja-Latn-hepburn" });

    expect(useProjectStore.getState().canUndo()).toBe(false);
  });
});
