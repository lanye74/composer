import { describe, expect, it } from "vitest";
import { MemoryAudioBlobStore } from "@/lib/audio-blob-store";
import { createProjectFromAudio } from "@/lib/create-project";
import { getLibraryProject } from "@/lib/library-persistence";
import { useSettingsStore } from "@/stores/settings";

// -- Helpers ------------------------------------------------------------------

function makeAudioFile(name: string, bytes: number[] = [1, 2, 3], type = "audio/mpeg"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

// -- Happy paths --------------------------------------------------------------

describe("create-project · happy paths", () => {
  it("creates a library entry from a dropped file with title from filename", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("pink-white.mp3");

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.title).toBe("pink-white");
    expect(stored?.metadata.artist).toBe("");
    expect(stored?.audioSource).toEqual({ kind: "file", name: "pink-white.mp3" });
    expect(stored?.audioBytesCached).toBe(true);
  });

  it("creates a library entry from a YouTube import with metadata", async () => {
    const audioBlobs = new MemoryAudioBlobStore();

    const id = await createProjectFromAudio(
      { kind: "youtube", videoId: "abc", title: "X", artist: "Y" },
      { audioBlobs },
    );

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.title).toBe("X");
    expect(stored?.metadata.artist).toBe("Y");
    expect(stored?.audioSource).toEqual({ kind: "youtube", videoId: "abc" });
    expect(stored?.audioBytesCached).toBe(false);
  });

  it("writes audio bytes to OPFS when a File is provided", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("song.mp3", [9, 8, 7]);

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const bytes = await audioBlobs.get(id);
    expect(bytes).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(bytes as ArrayBuffer)).toEqual(new Uint8Array([9, 8, 7]));
  });
});

// -- Edge cases ---------------------------------------------------------------

describe("create-project · edge cases", () => {
  it("preserves the extension-less title even if filename has no extension", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = new File([new Uint8Array([1])], "untitled", { type: "audio/mpeg" });

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.title).toBe("untitled");
  });

  it("strips known extensions case-insensitively", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const cases: Array<[string, string]> = [
      ["Song.MP3", "Song"],
      ["track.wav", "track"],
      ["clip.M4A", "clip"],
      ["loop.OGG", "loop"],
      ["sample.flac", "sample"],
      ["voice.OPUS", "voice"],
    ];

    for (const [filename, expectedTitle] of cases) {
      const file = new File([new Uint8Array([1])], filename, { type: "audio/mpeg" });
      const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
      const stored = await getLibraryProject(id);
      expect(stored?.metadata.title).toBe(expectedTitle);
    }
  });

  it("does not strip unknown extensions from the title", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = new File([new Uint8Array([1])], "song.weird", { type: "audio/mpeg" });

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.title).toBe("song.weird");
  });

  it("YouTube import without title falls back to videoId", async () => {
    const audioBlobs = new MemoryAudioBlobStore();

    const id = await createProjectFromAudio({ kind: "youtube", videoId: "vid123" }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.title).toBe("vid123");
  });

  it("YouTube import with audioFile bundles bytes immediately", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const audioFile = makeAudioFile("vid.opus", [5, 5, 5], "audio/ogg");

    const id = await createProjectFromAudio({ kind: "youtube", videoId: "vid", audioFile }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.audioBytesCached).toBe(true);
    const bytes = await audioBlobs.get(id);
    expect(new Uint8Array(bytes as ArrayBuffer)).toEqual(new Uint8Array([5, 5, 5]));
  });

  it("YouTube import propagates thumbnailDataUrl and tags it for the videoId", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const thumbnailDataUrl = "data:image/png;base64,abc";

    const id = await createProjectFromAudio({ kind: "youtube", videoId: "vid", thumbnailDataUrl }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.thumbnailDataUrl).toBe(thumbnailDataUrl);
    expect(stored?.metadata.thumbnailForVideoId).toBe("vid");
  });

  it("YouTube import with a duration writes it through to metadata", async () => {
    const audioBlobs = new MemoryAudioBlobStore();

    const id = await createProjectFromAudio({ kind: "youtube", videoId: "vid", duration: 213 }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.metadata.duration).toBe(213);
  });
});

// -- Invariants ---------------------------------------------------------------

describe("create-project · invariants", () => {
  it("returns a unique id on each call even with identical input", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("twice.mp3");

    const firstId = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });
    const secondId = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    expect(firstId).not.toBe(secondId);
    expect(await getLibraryProject(firstId)).toBeDefined();
    expect(await getLibraryProject(secondId)).toBeDefined();
  });

  it("sets createdAt, updatedAt, lastOpenedAt to the same value within the same call", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("ts.mp3");

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.createdAt).toBe(stored?.updatedAt);
    expect(stored?.createdAt).toBe(stored?.lastOpenedAt);
  });

  it("initialises lines, groups, and dismissals to empty arrays", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("fresh.mp3");

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.lines).toEqual([]);
    expect(stored?.groups).toEqual([]);
    expect(stored?.agents).toEqual([]);
    expect(stored?.dismissedSuggestions).toEqual([]);
    expect(stored?.dismissedExplicitSuggestions).toEqual([]);
  });

  it("inherits granularity from the user's defaultGranularity setting and defaults currentStem to original", async () => {
    useSettingsStore.setState({ defaultGranularity: "word" });
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("defaults.mp3");

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.granularity).toBe("word");
    expect(stored?.currentStem).toBe("original");
    expect(stored?.primingStripped).toBe(false);
  });

  it("honors a line-default setting when creating a new project", async () => {
    useSettingsStore.setState({ defaultGranularity: "line" });
    const audioBlobs = new MemoryAudioBlobStore();
    const file = makeAudioFile("line-default.mp3");

    const id = await createProjectFromAudio({ kind: "file", file }, { audioBlobs });

    const stored = await getLibraryProject(id);
    expect(stored?.granularity).toBe("line");
  });
});
