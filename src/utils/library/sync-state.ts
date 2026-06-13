import { hasAnyTiming } from "@/domain/line/predicates";
import type { LibraryProject } from "@/domain/project/library-project";

// -- Types --------------------------------------------------------------------

type SyncState = "synced" | "partial" | "empty";

// -- Public -------------------------------------------------------------------

function syncStateOf(project: LibraryProject): SyncState {
  const lines = project.lines;
  if (lines.length === 0) return "empty";
  const synced = lines.filter(hasAnyTiming).length;
  if (synced === 0) return "empty";
  if (synced === lines.length) return "synced";
  return "partial";
}

// -- Exports ------------------------------------------------------------------

export { syncStateOf };
export type { SyncState };
