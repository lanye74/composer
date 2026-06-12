import type { LibraryProject } from "@/domain/project/library-project";
import {
  LIBRARY_PROJECTS_STORE,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  setInStore,
} from "@/lib/persistence-idb";

// -- Reads --------------------------------------------------------------------

async function getLibraryProject(id: string): Promise<LibraryProject | undefined> {
  return getFromStore<LibraryProject>(LIBRARY_PROJECTS_STORE, id);
}

async function listLibraryProjects(): Promise<LibraryProject[]> {
  const all = await getAllFromStore<LibraryProject>(LIBRARY_PROJECTS_STORE);
  return all.toSorted((a, b) => {
    const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
    if (pinDiff !== 0) return pinDiff;
    return b.lastOpenedAt - a.lastOpenedAt;
  });
}

// -- Writes -------------------------------------------------------------------

async function putLibraryProject(project: LibraryProject): Promise<void> {
  await setInStore(LIBRARY_PROJECTS_STORE, project.id, project);
}

async function deleteLibraryProject(id: string): Promise<void> {
  await deleteFromStore(LIBRARY_PROJECTS_STORE, id);
}

// -- Exports ------------------------------------------------------------------

export { deleteLibraryProject, getLibraryProject, listLibraryProjects, putLibraryProject };
