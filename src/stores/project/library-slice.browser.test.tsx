import { describe, expect, it } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { MemoryAudioBlobStore } from "@/lib/audio-blob-store";
import { getLibraryProject, putLibraryProject } from "@/lib/library-persistence";
import { useProjectStore } from "@/stores/project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";

// -- Helpers ------------------------------------------------------------------

function makeProject(id: string, overrides: Partial<LibraryProject> = {}): LibraryProject {
  const now = Date.now();
  return {
    version: 1,
    id,
    metadata: { title: id, artist: "", album: "", duration: 0 },
    agents: [{ id: "v1", type: "person", name: `Lead-${id}` }],
    lines: [],
    groups: [],
    granularity: "line",
    syllableSplitDefaults: DEFAULT_SYLLABLE_SPLIT_DEFAULTS,
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

// -- Happy paths --------------------------------------------------------------

describe("library-slice · happy paths", () => {
  it("setActiveProject(id) loads the project state into the store", async () => {
    await putLibraryProject(
      makeProject("p1", { metadata: { title: "Loaded Title", artist: "A", album: "", duration: 0 } }),
    );

    await useProjectStore.getState().setActiveProject("p1", { audioBlobs: new MemoryAudioBlobStore() });

    const state = useProjectStore.getState();
    expect(state.activeProjectId).toBe("p1");
    expect(state.metadata.title).toBe("Loaded Title");
    expect(state.metadata.artist).toBe("A");
  });

  it("setActiveProject(undefined) resets the store to initial state", async () => {
    await putLibraryProject(makeProject("p1", { metadata: { title: "Seeded", artist: "", album: "", duration: 0 } }));
    await useProjectStore.getState().setActiveProject("p1", { audioBlobs: new MemoryAudioBlobStore() });
    expect(useProjectStore.getState().metadata.title).toBe("Seeded");

    await useProjectStore.getState().setActiveProject(undefined);

    const state = useProjectStore.getState();
    expect(state.activeProjectId).toBeUndefined();
    expect(state.metadata.title).toBe("");
    expect(state.lines).toEqual([]);
  });

  it("setActiveProject(id) updates lastOpenedAt in the library record", async () => {
    await putLibraryProject(makeProject("p1", { lastOpenedAt: 100 }));

    const before = Date.now();
    await useProjectStore.getState().setActiveProject("p1", { audioBlobs: new MemoryAudioBlobStore() });

    const reloaded = await getLibraryProject("p1");
    expect(reloaded?.lastOpenedAt).toBeGreaterThanOrEqual(before);
    expect(reloaded?.lastOpenedAt).toBeGreaterThan(100);
  });

  it("setActiveProject(id) preserves other library record fields when bumping lastOpenedAt", async () => {
    await putLibraryProject(
      makeProject("p1", { lastOpenedAt: 100, createdAt: 50, pinned: true, cachedWaveformDataUrl: "data:image/svg" }),
    );

    await useProjectStore.getState().setActiveProject("p1", { audioBlobs: new MemoryAudioBlobStore() });

    const reloaded = await getLibraryProject("p1");
    expect(reloaded?.createdAt).toBe(50);
    expect(reloaded?.pinned).toBe(true);
    expect(reloaded?.cachedWaveformDataUrl).toBe("data:image/svg");
  });
});

// -- Edge cases ---------------------------------------------------------------

describe("library-slice · edge cases", () => {
  it("setActiveProject(id) on a missing id sets activeProjectId but leaves the store otherwise untouched", async () => {
    useProjectStore.setState({
      metadata: { title: "Existing", artist: "", album: "", duration: 0 },
    });

    await useProjectStore.getState().setActiveProject("missing", { audioBlobs: new MemoryAudioBlobStore() });

    const state = useProjectStore.getState();
    expect(state.activeProjectId).toBe("missing");
    expect(state.metadata.title).toBe("Existing");
  });

  it("setActiveProject(id) without deps still loads state but skips persistence write", async () => {
    await putLibraryProject(
      makeProject("p1", { lastOpenedAt: 200, metadata: { title: "NoDeps", artist: "", album: "", duration: 0 } }),
    );

    await useProjectStore.getState().setActiveProject("p1");

    const state = useProjectStore.getState();
    expect(state.activeProjectId).toBe("p1");
    expect(state.metadata.title).toBe("NoDeps");

    const reloaded = await getLibraryProject("p1");
    expect(reloaded?.lastOpenedAt).toBe(200);
  });

  it("setActiveProject(undefined) clears history so undo cannot reach back into previous project", async () => {
    await putLibraryProject(makeProject("p1"));
    useProjectStore.setState({
      history: [{ lines: [], groups: [], timestamp: Date.now() }],
      historyIndex: 0,
      isDirty: true,
      isDirtySinceHistory: true,
    });

    await useProjectStore.getState().setActiveProject(undefined);

    const state = useProjectStore.getState();
    expect(state.history).toEqual([]);
    expect(state.historyIndex).toBe(-1);
    expect(state.isDirty).toBe(false);
    expect(state.isDirtySinceHistory).toBe(false);
  });
});

// -- Invariants ---------------------------------------------------------------

describe("library-slice · invariants", () => {
  it("two consecutive setActiveProject calls swap state cleanly", async () => {
    await putLibraryProject(makeProject("A", { metadata: { title: "Title-A", artist: "", album: "", duration: 0 } }));
    await putLibraryProject(makeProject("B", { metadata: { title: "Title-B", artist: "", album: "", duration: 0 } }));

    const audioBlobs = new MemoryAudioBlobStore();

    await useProjectStore.getState().setActiveProject("A", { audioBlobs });
    expect(useProjectStore.getState().metadata.title).toBe("Title-A");
    expect(useProjectStore.getState().activeProjectId).toBe("A");

    await useProjectStore.getState().setActiveProject("B", { audioBlobs });
    expect(useProjectStore.getState().metadata.title).toBe("Title-B");
    expect(useProjectStore.getState().activeProjectId).toBe("B");

    await useProjectStore.getState().setActiveProject("A", { audioBlobs });
    expect(useProjectStore.getState().metadata.title).toBe("Title-A");
    expect(useProjectStore.getState().activeProjectId).toBe("A");
  });

  it("loading a project clears history from the previous project", async () => {
    await putLibraryProject(makeProject("p1"));
    useProjectStore.setState({
      history: [{ lines: [], groups: [], timestamp: Date.now() }],
      historyIndex: 0,
      isDirty: true,
      isDirtySinceHistory: true,
    });

    await useProjectStore.getState().setActiveProject("p1", { audioBlobs: new MemoryAudioBlobStore() });

    const state = useProjectStore.getState();
    expect(state.history).toEqual([]);
    expect(state.historyIndex).toBe(-1);
    expect(state.isDirty).toBe(false);
    expect(state.isDirtySinceHistory).toBe(false);
  });
});
