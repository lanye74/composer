import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { userEvent } from "vitest/browser";
import { render as baseRender } from "vitest-browser-react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { LIBRARY_PROJECTS_QUERY_KEY } from "@/hooks/useLibraryProjects";
import { putLibraryProject } from "@/lib/library-persistence";
import { LibraryPage } from "@/pages/library/library-page";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";

// -- Helpers ------------------------------------------------------------------

function makeProject(overrides: Partial<LibraryProject> & Pick<LibraryProject, "id">): LibraryProject {
  return {
    version: 1,
    metadata: { title: `Title-${overrides.id}`, artist: "Artist", album: "", duration: 100 },
    agents: [],
    lines: [],
    groups: [],
    granularity: "word",
    syllableSplitDefaults: { applyToAll: false, caseInsensitive: false },
    audioBytesCached: false,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    createdAt: 0,
    updatedAt: 0,
    lastOpenedAt: 1,
    ...overrides,
  };
}

const noop = () => {};

// -- Tests --------------------------------------------------------------------

describe("LibraryPage", () => {
  it("shows the empty state when there are no projects", async () => {
    const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);
    await expect.element(screen.getByText("Drop an audio file to start")).toBeInTheDocument();
    await expect.element(screen.getByText(/No account needed/)).toBeInTheDocument();
  });

  it("renders all pinned projects in the Pinned section", async () => {
    await putLibraryProject(makeProject({ id: "pin-a", lastOpenedAt: 10, pinned: true }));
    await putLibraryProject(makeProject({ id: "pin-b", lastOpenedAt: 20, pinned: true }));
    await putLibraryProject(makeProject({ id: "loose-c", lastOpenedAt: 30 }));

    const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);

    await expect.element(screen.getByText("Title-pin-a")).toBeInTheDocument();
    await expect.element(screen.getByText("Title-pin-b")).toBeInTheDocument();

    const pinnedHeading = screen.container.querySelector("section[aria-labelledby='library-pinned-heading']");
    expect(pinnedHeading).not.toBeNull();
    const pinnedCards = pinnedHeading?.querySelectorAll("[role='button']");
    const pinnedTitles = Array.from(pinnedCards ?? [])
      .map((el) => el.getAttribute("aria-label") ?? "")
      .filter((t) => t.includes("Title-"));
    expect(pinnedTitles.length).toBe(2);
    expect(pinnedTitles.some((t) => t.includes("Title-pin-a"))).toBe(true);
    expect(pinnedTitles.some((t) => t.includes("Title-pin-b"))).toBe(true);
    expect(pinnedTitles.every((t) => !t.includes("Title-loose-c"))).toBe(true);
  });

  it("calls onOpenProject when a project card is clicked", async () => {
    await putLibraryProject(makeProject({ id: "clickme", lastOpenedAt: 100 }));
    const onOpen = vi.fn();
    const screen = await render(<LibraryPage onOpenProject={onOpen} onNewProject={noop} />);
    await screen.getByRole("button", { name: /Title-clickme/ }).click();
    expect(onOpen).toHaveBeenCalledWith("clickme");
  });

  it("calls onNewProject when the new project card is clicked", async () => {
    await putLibraryProject(makeProject({ id: "any", lastOpenedAt: 100 }));
    const onNew = vi.fn();
    const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={onNew} />);
    await screen.getByRole("button", { name: /New project/ }).click();
    expect(onNew).toHaveBeenCalled();
  });

  it("calls onOpenSearch when the search box is clicked", async () => {
    await putLibraryProject(makeProject({ id: "any2", lastOpenedAt: 100 }));
    const onSearch = vi.fn();
    const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} onOpenSearch={onSearch} />);
    await screen.getByRole("button", { name: /Search projects/ }).click();
    expect(onSearch).toHaveBeenCalled();
  });

  it("calls onNewProject from the empty-state button", async () => {
    const onNew = vi.fn();
    const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={onNew} />);
    await screen.getByRole("button", { name: /New project/ }).click();
    expect(onNew).toHaveBeenCalled();
  });

  describe("initial loading", () => {
    it("does not flash the empty state while the query is pending", async () => {
      let resolveQuery: (projects: LibraryProject[]) => void = () => {};
      const pending = new Promise<LibraryProject[]>((resolve) => {
        resolveQuery = resolve;
      });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY } },
      });
      queryClient.prefetchQuery({ queryKey: LIBRARY_PROJECTS_QUERY_KEY, queryFn: () => pending });

      const screen = await baseRender(
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="always">
            <LibraryPage onOpenProject={noop} onNewProject={noop} />
          </MotionConfig>
        </QueryClientProvider>,
      );

      expect(screen.container.textContent ?? "").not.toContain("Drop an audio file to start");

      resolveQuery([]);
      await expect.element(screen.getByText("Drop an audio file to start")).toBeInTheDocument();
    });
  });

  describe("filter chips", () => {
    it("hides synced projects when the 'Empty' chip is active", async () => {
      await putLibraryProject(
        makeProject({
          id: "synced-1",
          lines: [createLine({ text: "a", begin: 0, end: 1 })],
          lastOpenedAt: 100,
        }),
      );
      await putLibraryProject(
        makeProject({
          id: "empty-1",
          lines: [createLine({ text: "b" })],
          lastOpenedAt: 200,
        }),
      );

      const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);

      await expect.element(screen.getByText("Title-synced-1")).toBeInTheDocument();
      await screen.getByRole("tab", { name: "Empty" }).click();
      await expect.element(screen.getByText("Title-empty-1")).toBeInTheDocument();
      await expect.poll(() => screen.container.querySelector("button")?.textContent).toBeDefined();
      expect(screen.container.textContent ?? "").not.toContain("Title-synced-1");
    });

    it("shows only in-progress projects when the chip is active", async () => {
      await putLibraryProject(
        makeProject({
          id: "synced-2",
          lines: [createLine({ text: "a", begin: 0, end: 1 })],
        }),
      );
      await putLibraryProject(
        makeProject({
          id: "partial-2",
          lines: [createLine({ text: "a", begin: 0, end: 1 }), createLine({ text: "b" })],
        }),
      );

      const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);
      await screen.getByRole("tab", { name: "In progress" }).click();
      await expect.element(screen.getByText("Title-partial-2")).toBeInTheDocument();
      expect(screen.container.textContent ?? "").not.toContain("Title-synced-2");
    });
  });

  describe("keyboard", () => {
    it("closes the sort popover when Escape is pressed", async () => {
      await putLibraryProject(makeProject({ id: "kbd-1", lastOpenedAt: 1 }));
      const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);
      await screen.getByRole("button", { name: /Recently opened/ }).click();
      await expect.element(screen.getByRole("button", { name: "Title A to Z" })).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => screen.container.querySelector("[role='dialog']")).toBeNull();
    });

    it("filter chips are keyboard reachable via Tab", async () => {
      await putLibraryProject(makeProject({ id: "kbd-2", lastOpenedAt: 1 }));
      const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);
      const firstChip = screen.getByRole("tab", { name: "All" }).element() as HTMLElement;
      firstChip.focus();
      await expect.poll(() => document.activeElement).toBe(firstChip);
    });
  });

  describe("sort", () => {
    it("re-orders projects when 'Title A to Z' is picked from the sort menu", async () => {
      await putLibraryProject(
        makeProject({ id: "zeta", metadata: { title: "Zeta", artist: "", album: "", duration: 0 }, lastOpenedAt: 10 }),
      );
      await putLibraryProject(
        makeProject({
          id: "alpha",
          metadata: { title: "Alpha", artist: "", album: "", duration: 0 },
          lastOpenedAt: 20,
        }),
      );

      const screen = await render(<LibraryPage onOpenProject={noop} onNewProject={noop} />);

      await expect.element(screen.getByText("Alpha")).toBeInTheDocument();

      await screen.getByRole("button", { name: /Recently opened/ }).click();
      await screen.getByRole("button", { name: "Title A to Z" }).click();

      const cards = screen.container.querySelectorAll("[role='button']");
      const titles = Array.from(cards)
        .map((el) => el.getAttribute("aria-label") ?? el.textContent ?? "")
        .filter((t) => t.includes("Alpha") || t.includes("Zeta"));
      const alphaIdx = titles.findIndex((t) => t.includes("Alpha"));
      const zetaIdx = titles.findIndex((t) => t.includes("Zeta"));
      expect(alphaIdx).toBeGreaterThanOrEqual(0);
      expect(zetaIdx).toBeGreaterThan(alphaIdx);
    });
  });
});
