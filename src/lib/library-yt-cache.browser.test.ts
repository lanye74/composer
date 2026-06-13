import { describe, expect, it } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { MemoryAudioBlobStore } from "@/lib/audio-blob-store";
import { getLibraryProject, putLibraryProject } from "@/lib/library-persistence";
import { restoreAudioForProject } from "@/lib/library-resume";
import { saveActiveProjectAudio } from "@/lib/library-save";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";

// -- Helpers ------------------------------------------------------------------

function makeYouTubeProject(id: string, videoId: string, overrides: Partial<LibraryProject> = {}): LibraryProject {
  const now = Date.now();
  return {
    version: 1,
    id,
    metadata: { title: id, artist: "", album: "", duration: 0 },
    agents: [{ id: "v1", type: "person", name: "Lead" }],
    lines: [],
    groups: [],
    granularity: "line",
    syllableSplitDefaults: DEFAULT_SYLLABLE_SPLIT_DEFAULTS,
    audioSource: { kind: "youtube", videoId },
    audioBytesCached: false,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    ...overrides,
  };
}

function makeOpusFile(name: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], name, { type: "audio/mpeg" });
}

async function seedAndActivateYouTube(id: string, videoId: string, audioBlobs: MemoryAudioBlobStore): Promise<void> {
  await putLibraryProject(makeYouTubeProject(id, videoId));
  await useProjectStore.getState().setActiveProject(id, { audioBlobs });
}

// -- Happy paths --------------------------------------------------------------

describe("YouTube cache flow · happy paths", () => {
  it("flips audioBytesCached to true after the YT file lands in the audio store", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    await seedAndActivateYouTube("yt-cache-1", "vid-1", audioBlobs);

    useAudioStore.getState().setYouTubeSource("vid-1");
    expect(useAudioStore.getState().source).toEqual({
      type: "youtube",
      videoId: "vid-1",
      file: undefined,
    });

    const file = makeOpusFile("vid-1.opus", [1, 2, 3, 4]);
    useAudioStore.getState().setYouTubeFile(file);

    await saveActiveProjectAudio(file, { audioBlobs });

    await expect.poll(async () => (await getLibraryProject("yt-cache-1"))?.audioBytesCached).toBe(true);
    const bytes = await audioBlobs.get("yt-cache-1");
    expect(bytes).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(bytes as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("uses cached bytes from OPFS when reopening a YT project", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const cachedBytes = new Uint8Array([10, 20, 30, 40]).buffer;
    await audioBlobs.put("yt-cache-2", cachedBytes);
    await putLibraryProject(
      makeYouTubeProject("yt-cache-2", "vid-2", {
        audioBytesCached: true,
      }),
    );

    await restoreAudioForProject("yt-cache-2", { audioBlobs });

    const source = useAudioStore.getState().source;
    expect(source?.type).toBe("youtube");
    if (source?.type === "youtube") {
      expect(source.videoId).toBe("vid-2");
      expect(source.file).toBeInstanceOf(File);
      expect(source.file?.name).toBe("vid-2.opus");
      const restoredBytes = await source.file?.arrayBuffer();
      expect(new Uint8Array(restoredBytes as ArrayBuffer)).toEqual(new Uint8Array([10, 20, 30, 40]));
    }
  });

  it("evict then reopen falls back to no-file (tunnel will re-fetch)", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    const cachedBytes = new Uint8Array([99]).buffer;
    await audioBlobs.put("yt-cache-3", cachedBytes);
    await putLibraryProject(
      makeYouTubeProject("yt-cache-3", "vid-3", {
        audioBytesCached: true,
      }),
    );

    await audioBlobs.delete("yt-cache-3");
    const previous = await getLibraryProject("yt-cache-3");
    if (previous) await putLibraryProject({ ...previous, audioBytesCached: false });

    await restoreAudioForProject("yt-cache-3", { audioBlobs });

    const source = useAudioStore.getState().source;
    expect(source?.type).toBe("youtube");
    if (source?.type === "youtube") {
      expect(source.videoId).toBe("vid-3");
      expect(source.file).toBeUndefined();
    }
  });
});

// -- Edge cases ---------------------------------------------------------------

describe("YouTube cache flow · edge cases", () => {
  it("audioBytesCached stays false when no YT file ever arrives", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    await seedAndActivateYouTube("yt-cache-4", "vid-4", audioBlobs);

    useAudioStore.getState().setYouTubeSource("vid-4");

    const stored = await getLibraryProject("yt-cache-4");
    expect(stored?.audioBytesCached).toBe(false);
    expect(await audioBlobs.has("yt-cache-4")).toBe(false);
  });

  it("file change from one YT video to another updates the audio bytes", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    await putLibraryProject(makeYouTubeProject("yt-A", "aaa"));
    await putLibraryProject(makeYouTubeProject("yt-B", "bbb"));

    await useProjectStore.getState().setActiveProject("yt-A", { audioBlobs });
    useAudioStore.getState().setYouTubeSource("aaa");
    const fileA = makeOpusFile("aaa.opus", [1, 1, 1]);
    useAudioStore.getState().setYouTubeFile(fileA);
    await saveActiveProjectAudio(fileA, { audioBlobs });

    await useProjectStore.getState().setActiveProject("yt-B", { audioBlobs });
    useAudioStore.getState().setYouTubeSource("bbb");
    const fileB = makeOpusFile("bbb.opus", [2, 2, 2, 2]);
    useAudioStore.getState().setYouTubeFile(fileB);
    await saveActiveProjectAudio(fileB, { audioBlobs });

    const bytesA = await audioBlobs.get("yt-A");
    const bytesB = await audioBlobs.get("yt-B");
    expect(new Uint8Array(bytesA as ArrayBuffer)).toEqual(new Uint8Array([1, 1, 1]));
    expect(new Uint8Array(bytesB as ArrayBuffer)).toEqual(new Uint8Array([2, 2, 2, 2]));

    expect((await getLibraryProject("yt-A"))?.audioBytesCached).toBe(true);
    expect((await getLibraryProject("yt-B"))?.audioBytesCached).toBe(true);
  });

  it("restoreAudioForProject is a noop when the YT project's bytes are missing despite the cached flag", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    await putLibraryProject(
      makeYouTubeProject("yt-cache-5", "vid-5", {
        audioBytesCached: true,
      }),
    );

    await restoreAudioForProject("yt-cache-5", { audioBlobs });

    const source = useAudioStore.getState().source;
    expect(source?.type).toBe("youtube");
    if (source?.type === "youtube") {
      expect(source.videoId).toBe("vid-5");
      expect(source.file).toBeUndefined();
    }
  });
});

// -- Invariants ---------------------------------------------------------------

describe("YouTube cache flow · invariants", () => {
  it("restoring a cached YT project preserves the videoId on the audio source", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    await audioBlobs.put("yt-inv-1", new Uint8Array([7, 7]).buffer);
    await putLibraryProject(
      makeYouTubeProject("yt-inv-1", "preserved-id", {
        audioBytesCached: true,
      }),
    );

    await restoreAudioForProject("yt-inv-1", { audioBlobs });

    const source = useAudioStore.getState().source;
    if (source?.type === "youtube") {
      expect(source.videoId).toBe("preserved-id");
    }
  });

  it("saving a YT file does not clobber the saved audioSource", async () => {
    const audioBlobs = new MemoryAudioBlobStore();
    await seedAndActivateYouTube("yt-inv-2", "keep-id", audioBlobs);
    useAudioStore.getState().setYouTubeSource("keep-id");

    const file = makeOpusFile("keep-id.opus", [42]);
    useAudioStore.getState().setYouTubeFile(file);
    await saveActiveProjectAudio(file, { audioBlobs });

    const stored = await getLibraryProject("yt-inv-2");
    expect(stored?.audioSource).toEqual({ kind: "youtube", videoId: "keep-id" });
  });
});
