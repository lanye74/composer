import { createMetadataInitialState, createProjectInitialState } from "@/stores/project/project-initial-state";
import type { MetadataActions, MetadataState, ProjectStore } from "@/stores/project/types";
import type { StateCreator } from "zustand";

// -- Slice --------------------------------------------------------------------

const createMetadataSlice: StateCreator<ProjectStore, [], [], MetadataState & MetadataActions> = (set) => ({
  ...createMetadataInitialState(),

  setMetadata: (metadata) =>
    set((state) => ({
      metadata: { ...state.metadata, ...metadata },
      isDirty: true,
    })),

  reset: () => set(createProjectInitialState()),
});

// -- Exports ------------------------------------------------------------------

export { createMetadataSlice, createProjectInitialState };
