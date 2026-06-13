import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { userEvent } from "vitest/browser";
import { render as baseRender } from "vitest-browser-react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { LIBRARY_PROJECTS_QUERY_KEY } from "@/hooks/useLibraryProjects";
import { getLibraryProject, listLibraryProjects, putLibraryProject } from "@/lib/library-persistence";
import { LibraryPage } from "@/pages/library/library-page";
import { useAudioStore } from "@/stores/audio";
import { useConfirmStore } from "@/stores/confirm-store";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";
import { ConfirmModalHost } from "@/ui/confirm-modal";

// -- Drag helpers ------------------------------------------------------------

function dispatchDragEvent(target: Element, type: string, files: File[] = []) {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
}

async function waitForActiveProject(predicate: (id: string | undefined) => boolean): Promise<string> {
  return await new Promise<string>((resolve) => {
    const tick = () => {
      const id = useProjectStore.getState().activeProjectId;
      if (id && predicate(id)) return resolve(id);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

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
  it("shows the welcome heading and drop zone when there are no projects", async () => {
    const screen = await render(<LibraryPage onOpenProject={noop} />);
    await expect.element(screen.getByText("Welcome to Composer")).toBeInTheDocument();
    await expect.element(screen.getByText("Drop audio file here")).toBeInTheDocument();
    await expect.element(screen.getByLabelText("YouTube URL or video ID")).toBeInTheDocument();
  });

  it("creates a library project and exits library view when a file is dropped on the empty state", async () => {
    useAudioStore.setState({ source: null, isLoading: false });
    useProjectStore.setState({ activeProjectId: undefined });
    useUIStore.setState({ viewingLibrary: true });

    const screen = await render(<LibraryPage onOpenProject={noop} />);
    await expect.element(screen.getByText("Drop audio file here")).toBeInTheDocument();
    const dropLabel = screen.container.querySelector("label[for='file-drop-input']") as HTMLLabelElement;
    expect(dropLabel).not.toBeNull();
    const file = new File([new Uint8Array([1, 2, 3])], "First Song.mp3", { type: "audio/mpeg" });
    dispatchDragEvent(dropLabel, "drop", [file]);

    const activeId = await waitForActiveProject(() => true);
    const projects = await listLibraryProjects();
    const created = projects.find((p) => p.id === activeId);
    expect(created?.metadata.title).toBe("First Song");
    expect(created?.audioSource).toEqual({ kind: "file", name: "First Song.mp3" });
    await expect.poll(() => useUIStore.getState().viewingLibrary).toBe(false);
  });

  it("renders all pinned projects in the Pinned section", async () => {
    await putLibraryProject(makeProject({ id: "pin-a", lastOpenedAt: 10, pinned: true }));
    await putLibraryProject(makeProject({ id: "pin-b", lastOpenedAt: 20, pinned: true }));
    await putLibraryProject(makeProject({ id: "loose-c", lastOpenedAt: 30 }));

    const screen = await render(<LibraryPage onOpenProject={noop} />);

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
    const screen = await render(<LibraryPage onOpenProject={onOpen} />);
    await screen.getByRole("button", { name: /Title-clickme/ }).click();
    expect(onOpen).toHaveBeenCalledWith("clickme");
  });

  it("creates a library project when a file is dropped onto the New project card", async () => {
    await putLibraryProject(makeProject({ id: "any", lastOpenedAt: 100 }));
    useAudioStore.setState({ source: null, isLoading: false });
    useProjectStore.setState({ activeProjectId: undefined });
    useUIStore.setState({ viewingLibrary: true });

    const screen = await render(<LibraryPage onOpenProject={noop} />);
    const newCard = screen.getByRole("button", { name: /New project/ }).element() as HTMLElement;
    const file = new File([new Uint8Array([4, 5])], "Card Drop.mp3", { type: "audio/mpeg" });
    dispatchDragEvent(newCard, "drop", [file]);

    const activeId = await waitForActiveProject(() => true);
    const projects = await listLibraryProjects();
    const created = projects.find((p) => p.id === activeId);
    expect(created?.metadata.title).toBe("Card Drop");
    await expect.poll(() => useUIStore.getState().viewingLibrary).toBe(false);
  });

  it("calls onOpenSearch when the search box is clicked", async () => {
    await putLibraryProject(makeProject({ id: "any2", lastOpenedAt: 100 }));
    const onSearch = vi.fn();
    const screen = await render(<LibraryPage onOpenProject={noop} onOpenSearch={onSearch} />);
    await screen.getByRole("button", { name: /Search projects/ }).click();
    expect(onSearch).toHaveBeenCalled();
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
            <LibraryPage onOpenProject={noop} />
          </MotionConfig>
        </QueryClientProvider>,
      );

      expect(screen.container.textContent ?? "").not.toContain("Welcome to Composer");

      resolveQuery([]);
      await expect.element(screen.getByText("Welcome to Composer")).toBeInTheDocument();
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

      const screen = await render(<LibraryPage onOpenProject={noop} />);

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

      const screen = await render(<LibraryPage onOpenProject={noop} />);
      await screen.getByRole("tab", { name: "In progress" }).click();
      await expect.element(screen.getByText("Title-partial-2")).toBeInTheDocument();
      expect(screen.container.textContent ?? "").not.toContain("Title-synced-2");
    });
  });

  describe("keyboard", () => {
    it("closes the sort popover when Escape is pressed", async () => {
      await putLibraryProject(makeProject({ id: "kbd-1", lastOpenedAt: 1 }));
      const screen = await render(<LibraryPage onOpenProject={noop} />);
      await screen.getByRole("button", { name: /Recently opened/ }).click();
      await expect.element(screen.getByRole("menuitem", { name: "Title A to Z" })).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => screen.container.querySelector("[role='dialog']")).toBeNull();
    });

    it("filter chips are keyboard reachable via Tab", async () => {
      await putLibraryProject(makeProject({ id: "kbd-2", lastOpenedAt: 1 }));
      const screen = await render(<LibraryPage onOpenProject={noop} />);
      const firstChip = screen.getByRole("tab", { name: "All" }).element() as HTMLElement;
      firstChip.focus();
      await expect.poll(() => document.activeElement).toBe(firstChip);
    });
  });

  describe("actions wiring", () => {
    function findMenuItem(label: string): HTMLElement | undefined {
      const items = document.querySelectorAll<HTMLElement>("[role='menuitem']");
      return Array.from(items).find((el) => (el.textContent ?? "").startsWith(label));
    }

    it("right-clicking a card opens the context menu", async () => {
      await putLibraryProject(makeProject({ id: "ctx-open", lastOpenedAt: 1 }));
      const screen = await render(<LibraryPage onOpenProject={noop} />);
      await expect.element(screen.getByText("Title-ctx-open")).toBeInTheDocument();
      const card = screen.getByRole("button", { name: /Title-ctx-open/ }).element() as HTMLElement;
      card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
    });

    it("clicking 'Rename' from the menu starts inline edit on the card", async () => {
      await putLibraryProject(makeProject({ id: "rn", lastOpenedAt: 1 }));
      const screen = await render(<LibraryPage onOpenProject={noop} />);
      await expect.element(screen.getByText("Title-rn")).toBeInTheDocument();
      const card = screen.getByRole("button", { name: /Title-rn/ }).element() as HTMLElement;
      card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      await expect.poll(() => findMenuItem("Rename")).toBeDefined();
      findMenuItem("Rename")?.click();
      await expect.poll(() => screen.container.querySelector("input[aria-label='Project title']")).not.toBeNull();
    });

    it("clicking 'Pin to top' moves the project to the top after invalidation", async () => {
      await putLibraryProject(makeProject({ id: "a", lastOpenedAt: 10 }));
      await putLibraryProject(makeProject({ id: "b", lastOpenedAt: 100 }));
      const screen = await render(<LibraryPage onOpenProject={noop} />);
      await expect.element(screen.getByText("Title-a")).toBeInTheDocument();

      const card = screen.getByRole("button", { name: /Title-a/ }).element() as HTMLElement;
      card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      await expect.poll(() => findMenuItem("Pin to top")).toBeDefined();
      findMenuItem("Pin to top")?.click();

      await expect.poll(async () => (await getLibraryProject("a"))?.pinned).toBe(true);
      await expect
        .poll(() => screen.container.querySelector("section[aria-labelledby='library-pinned-heading']"))
        .not.toBeNull();
    });

    it("clicking 'Delete' and confirming removes the project from the list", async () => {
      await putLibraryProject(makeProject({ id: "del", lastOpenedAt: 1 }));
      await render(<ConfirmModalHost />);
      const screen = await render(<LibraryPage onOpenProject={noop} />);
      await expect.element(screen.getByText("Title-del")).toBeInTheDocument();

      const card = screen.getByRole("button", { name: /Title-del/ }).element() as HTMLElement;
      card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      await expect.poll(() => findMenuItem("Delete")).toBeDefined();
      findMenuItem("Delete")?.click();

      await expect.poll(() => useConfirmStore.getState().isOpen).toBe(true);
      useConfirmStore.getState().resolveAndClose(true, false);

      await expect.poll(async () => (await listLibraryProjects()).find((p) => p.id === "del")).toBeUndefined();
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

      const screen = await render(<LibraryPage onOpenProject={noop} />);

      await expect.element(screen.getByText("Alpha")).toBeInTheDocument();

      await screen.getByRole("button", { name: /Recently opened/ }).click();
      await screen.getByRole("menuitem", { name: "Title A to Z" }).click();

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
