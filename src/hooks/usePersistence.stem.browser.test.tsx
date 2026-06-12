import { beforeEach, describe, expect, it } from "vitest";
import { usePersistence } from "@/hooks/usePersistence";
import { getLibraryProject } from "@/lib/library-persistence";
import { cancelPendingSave } from "@/lib/persistence-debounce";
import { getPersistenceSettled } from "@/lib/persistence-settled";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useSeparationStore } from "@/stores/separation";
import { useSettingsStore } from "@/stores/settings";
import { seedLibraryProject } from "@/test/idb";
import { render } from "@/test/render";

// -- Test infrastructure ------------------------------------------------------

const SEEDED_ID = "stem-project";

const HookHost: React.FC = () => {
  usePersistence();
  return null;
};

// Tighten the debounce to 0 so save side-effects land within the test window.
function fastSaves(): void {
  useSettingsStore.getState().set("autoSaveDelay", 0);
}

function seedSavedProject(currentStem?: "original" | "vocals" | "instrumental"): Promise<void> {
  return seedLibraryProject(SEEDED_ID, {
    metadata: { title: "Seeded Song", artist: "", album: "", duration: 0 },
    agents: [{ id: "v1", type: "person", name: "Lead" }],
    granularity: "word",
    currentStem: currentStem ?? "original",
  });
}

async function pollSavedStem(): Promise<"original" | "vocals" | "instrumental" | undefined> {
  const saved = await getLibraryProject(SEEDED_ID);
  return saved?.currentStem;
}

beforeEach(() => {
  cancelPendingSave();
});

// -- Load: restore saved stem -------------------------------------------------

describe("usePersistence:load: restore saved stem", () => {
  it("restores 'vocals' when the saved project had vocals selected", async () => {
    await seedSavedProject("vocals");

    await render(<HookHost />);
    await getPersistenceSettled();

    expect(useSeparationStore.getState().currentStem).toBe("vocals");
  });

  it("restores 'instrumental' when the saved project had instrumental selected", async () => {
    await seedSavedProject("instrumental");

    await render(<HookHost />);
    await getPersistenceSettled();

    expect(useSeparationStore.getState().currentStem).toBe("instrumental");
  });

  it("leaves the store at 'original' when the saved project has no currentStem field (older project)", async () => {
    await seedSavedProject();

    await render(<HookHost />);
    await getPersistenceSettled();

    expect(useSeparationStore.getState().currentStem).toBe("original");
  });

  it("leaves the store at 'original' on a cold-start with no saved project", async () => {
    await render(<HookHost />);
    await getPersistenceSettled();

    expect(useSeparationStore.getState().currentStem).toBe("original");
  });
});

// -- Save: stem change triggers persistence -----------------------------------

describe("usePersistence:save: stem changes are persisted", () => {
  it("persists a stem selection made after load", async () => {
    await seedSavedProject();
    await render(<HookHost />);
    await getPersistenceSettled();
    fastSaves();
    useSeparationStore.setState({ availableStems: ["original", "vocals", "instrumental"] });

    useSeparationStore.getState().selectStem("vocals");

    await expect.poll(pollSavedStem).toBe("vocals");
  });

  it("persists the latest stem when the user switches rapidly", async () => {
    await seedSavedProject();
    await render(<HookHost />);
    await getPersistenceSettled();
    fastSaves();
    useSeparationStore.setState({ availableStems: ["original", "vocals", "instrumental"] });

    const { selectStem } = useSeparationStore.getState();
    selectStem("vocals");
    selectStem("instrumental");
    selectStem("original");

    await expect.poll(pollSavedStem).toBe("original");
  });

  it("does not change the stored stem when selectStem is called with an unavailable stem", async () => {
    await seedSavedProject("original");
    await render(<HookHost />);
    await getPersistenceSettled();
    fastSaves();

    useSeparationStore.getState().selectStem("vocals");

    await expect.poll(pollSavedStem).toBe("original");
    expect(useSeparationStore.getState().currentStem).toBe("original");
  });
});

// -- Boundary: stale projects without the field -----------------------------

describe("usePersistence:saved project field shape", () => {
  it("writes currentStem into the saved project record", async () => {
    await seedSavedProject();
    await render(<HookHost />);
    await getPersistenceSettled();
    fastSaves();
    useSeparationStore.setState({ availableStems: ["original", "vocals", "instrumental"] });

    useSeparationStore.getState().selectStem("instrumental");

    await expect.poll(async () => (await getLibraryProject(SEEDED_ID))?.currentStem).toBe("instrumental");
  });
});

// -- Regression: audio-only setup (no lyrics, no title) ---------------------

describe("usePersistence:stem persists in audio-only sessions", () => {
  it("persists the stem when the user has audio loaded but no project content", async () => {
    await seedLibraryProject(SEEDED_ID, {
      metadata: { title: "", artist: "", album: "", duration: 0 },
      currentStem: "original",
    });
    await render(<HookHost />);
    await getPersistenceSettled();
    fastSaves();

    const file = new File([new Uint8Array([1, 2, 3, 4])], "song.mp3", { type: "audio/mpeg" });
    useAudioStore.getState().setSource({ type: "file", file });
    useSeparationStore.setState({ availableStems: ["original", "vocals", "instrumental"] });

    useSeparationStore.getState().selectStem("vocals");

    await expect.poll(async () => (await getLibraryProject(SEEDED_ID))?.currentStem).toBe("vocals");
  });

  // This mirrors the real-world flow: default debounce delay (no fastSaves
  // shortcut). The user picks a stem and immediately reloads, within the
  // 2-second debounce window. The save must still land.
  it("persists across an immediate reload at the default debounce delay", async () => {
    await seedLibraryProject(SEEDED_ID, {
      metadata: { title: "", artist: "", album: "", duration: 0 },
      currentStem: "original",
    });
    await render(<HookHost />);
    await getPersistenceSettled();

    const file = new File([new Uint8Array([1, 2, 3, 4])], "song.mp3", { type: "audio/mpeg" });
    useAudioStore.getState().setSource({ type: "file", file });
    useSeparationStore.setState({ availableStems: ["original", "vocals", "instrumental"] });

    useSeparationStore.getState().selectStem("vocals");
    useProjectStore.getState().markDirty();
    window.dispatchEvent(new Event("beforeunload"));

    await expect.poll(async () => (await getLibraryProject(SEEDED_ID))?.currentStem).toBe("vocals");
  });
});
