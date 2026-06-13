import { type UseQueryResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { LibraryProject } from "@/domain/project/library-project";
import { listLibraryProjects } from "@/lib/library-persistence";

// -- Constants ----------------------------------------------------------------

const LIBRARY_PROJECTS_QUERY_KEY = ["library-projects"] as const;

// -- Hooks --------------------------------------------------------------------

function useLibraryProjects(): UseQueryResult<LibraryProject[], Error> {
  return useQuery<LibraryProject[]>({
    queryKey: LIBRARY_PROJECTS_QUERY_KEY,
    queryFn: listLibraryProjects,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });
}

function useInvalidateLibraryProjects(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: LIBRARY_PROJECTS_QUERY_KEY });
  }, [queryClient]);
}

// -- Exports ------------------------------------------------------------------

export { LIBRARY_PROJECTS_QUERY_KEY, useInvalidateLibraryProjects, useLibraryProjects };
