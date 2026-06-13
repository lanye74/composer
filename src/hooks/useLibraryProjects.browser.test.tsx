import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";
import type { LibraryProject } from "@/domain/project/library-project";
import { useInvalidateLibraryProjects, useLibraryProjects } from "@/hooks/useLibraryProjects";
import { putLibraryProject } from "@/lib/library-persistence";

// -- Helpers ------------------------------------------------------------------

function makeProject(overrides: Partial<LibraryProject> & Pick<LibraryProject, "id">): LibraryProject {
  return {
    version: 1,
    metadata: { title: "Untitled", artist: "", album: "", duration: 0 },
    agents: [],
    lines: [],
    groups: [],
    granularity: "word",
    syllableSplitDefaults: { applyToAll: false, caseInsensitive: false },
    audioBytesCached: false,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
    lastOpenedAt: 1_000_000,
    ...overrides,
  };
}

function buildWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// -- Tests --------------------------------------------------------------------

describe("useLibraryProjects", () => {
  it("returns library projects in pinned-first + lastOpenedAt desc order", async () => {
    await putLibraryProject(makeProject({ id: "a", lastOpenedAt: 100 }));
    await putLibraryProject(makeProject({ id: "b", lastOpenedAt: 300 }));
    await putLibraryProject(makeProject({ id: "c", lastOpenedAt: 200, pinned: true }));

    const { result } = await renderHook(() => useLibraryProjects(), { wrapper: buildWrapper() });

    await expect.poll(() => result.current.data?.length).toBe(3);
    const ids = result.current.data?.map((p) => p.id) ?? [];
    expect(ids).toEqual(["c", "b", "a"]);
  });

  it("returns [] when no projects exist", async () => {
    const { result } = await renderHook(() => useLibraryProjects(), { wrapper: buildWrapper() });
    await expect.poll(() => result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it("re-runs after invalidation", async () => {
    await putLibraryProject(makeProject({ id: "only-a", lastOpenedAt: 100 }));

    const wrapper = buildWrapper();
    const { result } = await renderHook(
      () => ({ query: useLibraryProjects(), invalidate: useInvalidateLibraryProjects() }),
      { wrapper },
    );

    await expect.poll(() => result.current.query.data?.length).toBe(1);

    await putLibraryProject(makeProject({ id: "fresh-b", lastOpenedAt: 500 }));
    await result.current.invalidate();

    await expect.poll(() => result.current.query.data?.length).toBe(2);
    expect(result.current.query.data?.map((p) => p.id)).toEqual(["fresh-b", "only-a"]);
  });
});
