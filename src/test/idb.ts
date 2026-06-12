import type { LibraryProject } from "@/domain/project/library-project";
import type { AudioBlobStore } from "@/lib/audio-blob-store";
import { putLibraryProject } from "@/lib/library-persistence";
import { PROJECT_STORE_NAME, setInStore } from "@/lib/persistence-idb";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";

// -- Constants -----------------------------------------------------------------

const CURRENT_KEY = "current";
const AUDIO_KEY = "current-audio";

// -- Types ---------------------------------------------------------------------

interface SeedAudioFileArgs {
  name: string;
  type: string;
  data: ArrayBuffer;
}

// -- Helpers -------------------------------------------------------------------

function seedProject(project: unknown): Promise<void> {
  return setInStore(PROJECT_STORE_NAME, CURRENT_KEY, project);
}

function seedAudioFile(args: SeedAudioFileArgs): Promise<void> {
  return setInStore(PROJECT_STORE_NAME, AUDIO_KEY, args);
}

function buildLibraryProject(id: string, overrides: Partial<LibraryProject> = {}): LibraryProject {
  const now = Date.now();
  return {
    version: 1,
    id,
    metadata: { title: id, artist: "", album: "", duration: 0 },
    agents: [],
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

async function seedLibraryProject(id: string, overrides: Partial<LibraryProject> = {}): Promise<void> {
  await putLibraryProject(buildLibraryProject(id, overrides));
}

async function seedLibraryProjectWithAudio(
  id: string,
  audioBlobs: AudioBlobStore,
  audio: { bytes: ArrayBuffer; source: { kind: "file"; name: string } | { kind: "youtube"; videoId: string } },
  overrides: Partial<LibraryProject> = {},
): Promise<void> {
  await audioBlobs.put(id, audio.bytes);
  await putLibraryProject(buildLibraryProject(id, { ...overrides, audioSource: audio.source, audioBytesCached: true }));
}

// -- Exports -------------------------------------------------------------------

export { buildLibraryProject, seedAudioFile, seedLibraryProject, seedLibraryProjectWithAudio, seedProject };
