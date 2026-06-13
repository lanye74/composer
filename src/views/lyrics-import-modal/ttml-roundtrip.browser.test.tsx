import { describe, expect, it } from "vitest";
import { audioBlobs } from "@/lib/audio-blob-store-singleton";
import { getLibraryProject } from "@/lib/library-persistence";
import { saveActiveProject } from "@/lib/library-save";
import { createProjectFromAudio } from "@/lib/create-project";
import { openLibraryProject } from "@/lib/library-resume";
import { parseLyricsFile } from "@/utils/lyrics-parsers";
import { generateTTML } from "@/utils/ttml";
import { importParsedLyrics } from "@/views/lyrics-import-modal/use-import-modal-actions";
import { useProjectStore } from "@/stores/project";

const sampleWordSyncedTtml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:timeBase="media" xml:lang="en">
  <head><metadata><ttm:agent xml:id="v1" type="person"><ttm:name>Lead</ttm:name></ttm:agent></metadata></head>
  <body>
    <div>
      <p begin="00:00.000" end="00:02.500" ttm:agent="v1">
        <span begin="00:00.000" end="00:00.500">Hello</span>
        <span begin="00:00.500" end="00:01.000">word</span>
      </p>
    </div>
  </body>
</tt>`;

// Real-world TTML the user reported as incorrectly importing as line-synced.
// Single-line export (no whitespace between p and span), composer:timing="Word".
const minifiedComposerExportTtml = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" xmlns:composer="https://composer.boidu.dev/ttml" ttp:timeBase="media" xml:lang="en" composer:timing="Word"><head><metadata><ttm:title>Test</ttm:title><ttm:agent xml:id="v1" type="person"><ttm:name>Lead</ttm:name></ttm:agent></metadata></head><body dur="0:10.000"><div><p begin="0:34.821" end="0:36.573" ttm:agent="v1"><span begin="0:34.821" end="0:35.349">Fallen</span> <span begin="0:35.349" end="0:36.573">angel</span></p><p begin="0:38.542" end="0:39.985" ttm:agent="v1"><span begin="0:38.542" end="0:38.805">Its</span> <span begin="0:38.805" end="0:39.985">alright</span></p></div></body></tt>`;

describe("TTML import → store → persist roundtrip", () => {
  it("preserves word timing through import and autosave", async () => {
    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    await openLibraryProject(id, { audioBlobs });
    const parsed = parseLyricsFile("a.ttml", sampleWordSyncedTtml);
    console.log("parsed.hasTimingData", parsed.hasTimingData);
    console.log("parsed.lines[0]", JSON.stringify(parsed.lines[0]));
    expect(parsed.hasTimingData).toBe(true);
    expect(parsed.lines[0]?.words?.length).toBeGreaterThan(0);

    await importParsedLyrics(parsed, {
      confirm: async () => true,
      agents: useProjectStore.getState().agents,
      audioDuration: 60,
      applyBackgroundExtraction: false,
      backgroundExtractionMergeStandalone: false,
      backgroundExtractionPreserveBrackets: false,
      source: { label: "test", filename: "a.ttml" },
    });
    const memLines = useProjectStore.getState().lines;
    expect(memLines[0]?.words?.length).toBeGreaterThan(0);
    expect(memLines[0]?.begin).toBeUndefined();

    await saveActiveProject();
    const persisted = await getLibraryProject(id);
    expect(persisted?.lines[0]?.words?.length).toBeGreaterThan(0);
    expect(persisted?.lines[0]?.begin).toBeUndefined();
  });

  it("survives a full reopen: save, reset memory, reopen by id", async () => {
    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    await openLibraryProject(id, { audioBlobs });
    const parsed = parseLyricsFile("a.ttml", sampleWordSyncedTtml);
    await importParsedLyrics(parsed, {
      confirm: async () => true,
      agents: useProjectStore.getState().agents,
      audioDuration: 60,
      applyBackgroundExtraction: false,
      backgroundExtractionMergeStandalone: false,
      backgroundExtractionPreserveBrackets: false,
      source: { label: "test", filename: "a.ttml" },
    });
    await saveActiveProject();

    await useProjectStore.getState().setActiveProject(undefined);
    expect(useProjectStore.getState().lines.length).toBe(0);

    await openLibraryProject(id, { audioBlobs });
    const lines = useProjectStore.getState().lines;
    expect(lines[0]?.words?.length).toBeGreaterThan(0);
    expect(lines[0]?.begin).toBeUndefined();
  });

  it("regression: minified single-line composer-export TTML re-imports as word-synced, not line-synced", async () => {
    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    await openLibraryProject(id, { audioBlobs });

    const parsed = parseLyricsFile("real.ttml", minifiedComposerExportTtml);
    expect(parsed.hasTimingData).toBe(true);
    expect(parsed.lines.length).toBeGreaterThanOrEqual(2);
    for (const line of parsed.lines) {
      expect(line.words?.length).toBeGreaterThan(0);
      expect(line.begin).toBeUndefined();
    }

    await importParsedLyrics(parsed, {
      confirm: async () => true,
      agents: useProjectStore.getState().agents,
      audioDuration: 0,
      applyBackgroundExtraction: false,
      backgroundExtractionMergeStandalone: false,
      backgroundExtractionPreserveBrackets: false,
      source: { label: "test", filename: "real.ttml" },
    });

    const memLines = useProjectStore.getState().lines;
    expect(memLines.every((l) => l.words && l.words.length > 0)).toBe(true);
  });

  it("regression: import promotes the project's granularity field to match imported word timing", async () => {
    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    await openLibraryProject(id, { audioBlobs });

    useProjectStore.getState().setGranularity("line");

    const parsed = parseLyricsFile("real.ttml", minifiedComposerExportTtml);
    await importParsedLyrics(parsed, {
      confirm: async () => true,
      agents: useProjectStore.getState().agents,
      audioDuration: 0,
      applyBackgroundExtraction: false,
      backgroundExtractionMergeStandalone: false,
      backgroundExtractionPreserveBrackets: false,
      source: { label: "test", filename: "real.ttml" },
    });

    expect(useProjectStore.getState().granularity).toBe("word");
  });

  it("regression: exported TTML emits <span> per word when the lines have populated words, regardless of granularity field", async () => {
    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    await openLibraryProject(id, { audioBlobs });

    const parsed = parseLyricsFile("real.ttml", minifiedComposerExportTtml);
    await importParsedLyrics(parsed, {
      confirm: async () => true,
      agents: useProjectStore.getState().agents,
      audioDuration: 0,
      applyBackgroundExtraction: false,
      backgroundExtractionMergeStandalone: false,
      backgroundExtractionPreserveBrackets: false,
      source: { label: "test", filename: "real.ttml" },
    });

    const state = useProjectStore.getState();
    const ttml = generateTTML({
      metadata: state.metadata,
      agents: state.agents,
      lines: state.lines,
      groups: state.groups,
      granularity: "line",
      minify: true,
    });
    expect(ttml).toContain('composer:timing="Word"');
    expect(ttml).toMatch(/<span begin="[^"]+" end="[^"]+">Fallen<\/span>/);
  });

  it("regression: composer-export TTML re-imports as word-synced even with background extraction enabled", async () => {
    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    await openLibraryProject(id, { audioBlobs });

    const parsed = parseLyricsFile("real.ttml", minifiedComposerExportTtml);
    await importParsedLyrics(parsed, {
      confirm: async () => true,
      agents: useProjectStore.getState().agents,
      audioDuration: 0,
      applyBackgroundExtraction: true,
      backgroundExtractionMergeStandalone: true,
      backgroundExtractionPreserveBrackets: false,
      source: { label: "test", filename: "real.ttml" },
    });

    const memLines = useProjectStore.getState().lines;
    expect(memLines.every((l) => l.words && l.words.length > 0)).toBe(true);
  });
});
