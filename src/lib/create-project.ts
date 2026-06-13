import type { LibraryProject } from "@/domain/project/library-project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/domain/project/syllable-split-defaults";
import type { AudioBlobStore } from "@/lib/audio-blob-store";
import { putLibraryProject } from "@/lib/library-persistence";
import type { SavedAudioSource } from "@/lib/persistence";
import { useSettingsStore } from "@/stores/settings";

// -- Types --------------------------------------------------------------------

interface CreateProjectDeps {
  audioBlobs: AudioBlobStore;
}

interface CreateProjectFromFile {
  kind: "file";
  file: File;
}

interface CreateProjectFromYouTube {
  kind: "youtube";
  videoId: string;
  title?: string;
  artist?: string;
  thumbnailDataUrl?: string;
  audioFile?: File;
  duration?: number;
}

type CreateProjectInput = CreateProjectFromFile | CreateProjectFromYouTube;

// -- Constants ----------------------------------------------------------------

const KNOWN_AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|ogg|flac|opus)$/i;

// -- Helpers ------------------------------------------------------------------

function stripKnownAudioExtension(filename: string): string {
  return filename.replace(KNOWN_AUDIO_EXTENSIONS, "");
}

function buildMetadataForFile(file: File): LibraryProject["metadata"] {
  return {
    title: stripKnownAudioExtension(file.name),
    artist: "",
    album: "",
    duration: 0,
  };
}

function buildMetadataForYouTube(input: CreateProjectFromYouTube): LibraryProject["metadata"] {
  return {
    title: input.title ?? input.videoId,
    artist: input.artist ?? "",
    album: "",
    duration: input.duration ?? 0,
    ...(input.thumbnailDataUrl ? { thumbnailDataUrl: input.thumbnailDataUrl, thumbnailForVideoId: input.videoId } : {}),
  };
}

function buildAudioSource(input: CreateProjectInput): SavedAudioSource {
  if (input.kind === "file") return { kind: "file", name: input.file.name };
  return { kind: "youtube", videoId: input.videoId };
}

function resolveAudioFile(input: CreateProjectInput): File | undefined {
  if (input.kind === "file") return input.file;
  return input.audioFile;
}

// -- Public API ---------------------------------------------------------------

async function createProjectFromAudio(input: CreateProjectInput, deps: CreateProjectDeps): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const audioFile = resolveAudioFile(input);
  let audioBytesCached = false;

  if (audioFile) {
    const bytes = await audioFile.arrayBuffer();
    await deps.audioBlobs.put(id, bytes);
    audioBytesCached = true;
  }

  const project: LibraryProject = {
    version: 1,
    id,
    metadata: input.kind === "file" ? buildMetadataForFile(input.file) : buildMetadataForYouTube(input),
    agents: [],
    lines: [],
    groups: [],
    granularity: useSettingsStore.getState().defaultGranularity,
    syllableSplitDefaults: DEFAULT_SYLLABLE_SPLIT_DEFAULTS,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    primingStripped: false,
    audioSource: buildAudioSource(input),
    audioBytesCached,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  await putLibraryProject(project);
  return id;
}

// -- Exports ------------------------------------------------------------------

export { createProjectFromAudio };
export type { CreateProjectDeps, CreateProjectFromFile, CreateProjectFromYouTube, CreateProjectInput };
