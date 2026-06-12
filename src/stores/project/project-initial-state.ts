import { createAgentsInitialState } from "@/stores/project/agents-slice";
import { createDismissalsInitialState } from "@/stores/project/dismissals-slice";
import { createGroupsInitialState } from "@/stores/project/groups-slice";
import { createHistoryInitialState } from "@/stores/project/history-slice";
import { createLibraryInitialState } from "@/stores/project/library-slice";
import { createLinesInitialState } from "@/stores/project/lines-slice";
import type { MetadataState, ProjectState } from "@/stores/project/types";
import { createUiInitialState } from "@/stores/project/ui-slice";

// -- Initial State ------------------------------------------------------------

function createMetadataInitialState(): MetadataState {
  return {
    metadata: {
      title: "",
      artist: "",
      album: "",
      duration: 0,
    },
  };
}

function createProjectInitialState(): ProjectState {
  return {
    ...createMetadataInitialState(),
    ...createAgentsInitialState(),
    ...createLinesInitialState(),
    ...createGroupsInitialState(),
    ...createUiInitialState(),
    ...createDismissalsInitialState(),
    ...createHistoryInitialState(),
    ...createLibraryInitialState(),
  };
}

// -- Exports ------------------------------------------------------------------

export { createMetadataInitialState, createProjectInitialState };
