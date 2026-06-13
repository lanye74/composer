import { getLibraryProject, putLibraryProject } from "@/lib/library-persistence";
import { cancelPendingSave, flushPendingSave } from "@/lib/persistence-debounce";
import { createProjectInitialState } from "@/stores/project/project-initial-state";
import type { LibraryActions, LibraryState, ProjectStore } from "@/stores/project/types";
import type { StateCreator } from "zustand";

// -- Initial State ------------------------------------------------------------

function createLibraryInitialState(): LibraryState {
  return {
    activeProjectId: undefined,
  };
}

// -- Slice --------------------------------------------------------------------

const createLibrarySlice: StateCreator<ProjectStore, [], [], LibraryState & LibraryActions> = (set, get) => ({
  ...createLibraryInitialState(),

  setActiveProject: async (id, deps) => {
    const previousId = get().activeProjectId;
    if (previousId !== undefined && previousId !== id) {
      await flushPendingSave();
      cancelPendingSave();
    }

    if (id === undefined) {
      set({ ...createProjectInitialState(), activeProjectId: undefined });
      return;
    }

    const project = await getLibraryProject(id);
    if (!project) {
      set({ activeProjectId: id });
      return;
    }

    set({
      ...createProjectInitialState(),
      metadata: project.metadata,
      agents: project.agents,
      lines: project.lines,
      groups: project.groups,
      granularity: project.granularity,
      syllableSplitDefaults: project.syllableSplitDefaults,
      dismissedSuggestions: project.dismissedSuggestions,
      dismissedExplicitSuggestions: project.dismissedExplicitSuggestions,
      primingStripped: project.primingStripped ?? false,
      activeProjectId: id,
    });

    if (deps) {
      await putLibraryProject({ ...project, lastOpenedAt: Date.now() });
    }
  },
});

// -- Exports ------------------------------------------------------------------

export { createLibrarySlice, createLibraryInitialState };
