import { describe, expect, it, vi } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { ProjectCard } from "@/ui/library/project-card";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";

// -- Helpers ------------------------------------------------------------------

function makeProject(overrides: Partial<LibraryProject> = {}): LibraryProject {
  return {
    version: 1,
    id: "proj-1",
    metadata: { title: "Sample Song", artist: "Sample Artist", album: "", duration: 200 },
    agents: [],
    lines: [],
    groups: [],
    granularity: "word",
    syllableSplitDefaults: { applyToAll: false, caseInsensitive: false },
    audioBytesCached: false,
    dismissedSuggestions: [],
    dismissedExplicitSuggestions: [],
    currentStem: "original",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
    ...overrides,
  };
}

const noop = () => {};

// -- Tests --------------------------------------------------------------------

describe("ProjectCard", () => {
  it("renders the project title and artist", async () => {
    const project = makeProject({
      metadata: { title: "Bohemian Rhapsody", artist: "Queen", album: "", duration: 354 },
    });
    const screen = await render(<ProjectCard project={project} onOpen={noop} />);
    await expect.element(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
    await expect.element(screen.getByText("Queen")).toBeInTheDocument();
  });

  it("renders the thumbnail when metadata.thumbnailDataUrl is present", async () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const project = makeProject({
      metadata: { title: "T", artist: "A", album: "", duration: 100, thumbnailDataUrl: dataUrl },
    });
    const screen = await render(<ProjectCard project={project} onOpen={noop} />);
    const img = screen.container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(dataUrl);
    expect(screen.container.querySelector("svg[aria-label='Waveform']")).toBeNull();
  });

  it("falls back to the waveform when no thumbnail is present", async () => {
    const project = makeProject();
    const screen = await render(<ProjectCard project={project} onOpen={noop} />);
    expect(screen.container.querySelector("img")).toBeNull();
    expect(screen.container.querySelector("svg[aria-label='Waveform']")).not.toBeNull();
  });

  it("calls onOpen with the project id on click", async () => {
    const project = makeProject({ id: "proj-42" });
    const onOpen = vi.fn();
    const screen = await render(<ProjectCard project={project} onOpen={onOpen} />);
    await screen.getByRole("button", { name: /Sample Song/i }).click();
    expect(onOpen).toHaveBeenCalledWith("proj-42");
  });

  it("shows the synced badge for fully synced projects", async () => {
    const project = makeProject({
      lines: [createLine({ text: "a", begin: 0, end: 1 }), createLine({ text: "b", begin: 1, end: 2 })],
    });
    const screen = await render(<ProjectCard project={project} onOpen={noop} />);
    await expect.element(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("shows the in-progress badge when some lines are synced", async () => {
    const project = makeProject({
      lines: [createLine({ text: "a", begin: 0, end: 1 }), createLine({ text: "b" })],
    });
    const screen = await render(<ProjectCard project={project} onOpen={noop} />);
    await expect.element(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("shows the lyrics-only badge when no lines are synced", async () => {
    const project = makeProject({ lines: [createLine({ text: "a" })] });
    const screen = await render(<ProjectCard project={project} onOpen={noop} />);
    await expect.element(screen.getByText("Lyrics only")).toBeInTheDocument();
  });

  it("calls onContextMenu on right-click", async () => {
    const project = makeProject({ id: "ctx-id" });
    const onContext = vi.fn();
    const screen = await render(<ProjectCard project={project} onOpen={noop} onContextMenu={onContext} />);
    const button = screen.getByRole("button", { name: /Sample Song/i }).element() as HTMLElement;
    button.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    expect(onContext).toHaveBeenCalledTimes(1);
    expect(onContext.mock.calls[0][1]).toBe("ctx-id");
  });

  describe("edge cases", () => {
    it("renders 'Untitled' when title is empty", async () => {
      const project = makeProject({ metadata: { title: "", artist: "Q", album: "", duration: 100 } });
      const screen = await render(<ProjectCard project={project} onOpen={noop} />);
      await expect.element(screen.getByText("Untitled")).toBeInTheDocument();
    });

    it("renders 'No audio' for zero-duration projects", async () => {
      const project = makeProject({ metadata: { title: "T", artist: "A", album: "", duration: 0 } });
      const screen = await render(<ProjectCard project={project} onOpen={noop} />);
      await expect.element(screen.getByText("No audio")).toBeInTheDocument();
    });
  });
});
