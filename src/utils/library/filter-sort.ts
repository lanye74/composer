import type { LibraryProject } from "@/domain/project/library-project";
import { syncStateOf } from "@/domain/project/sync-state";

// -- Types --------------------------------------------------------------------

type FilterChip = "all" | "in-progress" | "synced" | "empty";
type SortKey = "recent" | "created" | "title" | "artist" | "duration";

// -- Filters ------------------------------------------------------------------

function filterProjects(projects: LibraryProject[], chip: FilterChip): LibraryProject[] {
  if (chip === "all") return projects;
  return projects.filter((project) => {
    const state = syncStateOf(project);
    if (chip === "synced") return state === "synced";
    if (chip === "in-progress") return state === "partial";
    return state === "empty";
  });
}

// -- Sorts --------------------------------------------------------------------

function compareByLastOpened(a: LibraryProject, b: LibraryProject): number {
  const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
  if (pinDiff !== 0) return pinDiff;
  return b.lastOpenedAt - a.lastOpenedAt;
}

function sortProjects(projects: LibraryProject[], key: SortKey): LibraryProject[] {
  if (key === "recent") return projects.toSorted(compareByLastOpened);

  if (key === "created") {
    return projects.toSorted((a, b) => {
      const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
      if (pinDiff !== 0) return pinDiff;
      const created = b.createdAt - a.createdAt;
      return created !== 0 ? created : b.lastOpenedAt - a.lastOpenedAt;
    });
  }

  if (key === "duration") {
    return projects.toSorted((a, b) => {
      const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
      if (pinDiff !== 0) return pinDiff;
      const dur = b.metadata.duration - a.metadata.duration;
      return dur !== 0 ? dur : b.lastOpenedAt - a.lastOpenedAt;
    });
  }

  const field: "title" | "artist" = key;
  return projects.toSorted((a, b) => {
    const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
    if (pinDiff !== 0) return pinDiff;
    const lex = (a.metadata[field] || "").localeCompare(b.metadata[field] || "", undefined, {
      sensitivity: "base",
    });
    return lex !== 0 ? lex : b.lastOpenedAt - a.lastOpenedAt;
  });
}

// -- Exports ------------------------------------------------------------------

export { filterProjects, sortProjects };
export type { FilterChip, SortKey };
