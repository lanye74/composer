import { userEvent } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import type { LibraryProject } from "@/domain/project/library-project";
import { ProjectCardContextMenu } from "@/ui/library/project-card-context-menu";
import { render } from "@/test/render";

// -- Helpers ------------------------------------------------------------------

function makeProject(overrides: Partial<LibraryProject> = {}): LibraryProject {
  return {
    version: 1,
    id: "proj-1",
    metadata: { title: "Sample", artist: "Artist", album: "", duration: 200 },
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
    lastOpenedAt: 0,
    ...overrides,
  };
}

function findMenuItem(label: string): HTMLButtonElement | undefined {
  const items = document.querySelectorAll<HTMLButtonElement>("[role='menuitem']");
  return Array.from(items).find((el) => (el.textContent ?? "").startsWith(label));
}

function getBodyText(): string {
  return document.body.textContent ?? "";
}

const noop = () => {};

// -- Tests --------------------------------------------------------------------

describe("ProjectCardContextMenu", () => {
  it("renders all top-level actions for a pinned youtube project with cached bytes", async () => {
    const project = makeProject({
      pinned: true,
      audioSource: { kind: "youtube", videoId: "abc" },
      audioBytesCached: true,
    });
    await render(
      <ProjectCardContextMenu open position={{ x: 100, y: 100 }} project={project} onClose={noop} onAction={noop} />,
    );
    await expect.poll(() => findMenuItem("Open")).toBeDefined();
    expect(findMenuItem("Rename")).toBeDefined();
    expect(findMenuItem("Duplicate")).toBeDefined();
    expect(findMenuItem("Unpin")).toBeDefined();
    expect(findMenuItem("Evict audio")).toBeDefined();
    expect(findMenuItem("Export TTML")).toBeDefined();
    expect(findMenuItem("Export project JSON")).toBeDefined();
    expect(findMenuItem("Delete")).toBeDefined();
  });

  it("does not render evict audio for file-source projects", async () => {
    const project = makeProject({
      audioSource: { kind: "file", name: "a.mp3" },
      audioBytesCached: true,
    });
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={noop} />,
    );
    await expect.poll(() => findMenuItem("Rename")).toBeDefined();
    expect(findMenuItem("Evict audio")).toBeUndefined();
  });

  it("does not render evict audio for youtube projects without cached bytes", async () => {
    const project = makeProject({
      audioSource: { kind: "youtube", videoId: "xyz" },
      audioBytesCached: false,
    });
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={noop} />,
    );
    await expect.poll(() => findMenuItem("Rename")).toBeDefined();
    expect(findMenuItem("Evict audio")).toBeUndefined();
  });

  it("shows 'Pin to top' for unpinned projects", async () => {
    const project = makeProject({ pinned: false });
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={noop} />,
    );
    await expect.poll(() => findMenuItem("Pin to top")).toBeDefined();
    expect(findMenuItem("Unpin")).toBeUndefined();
  });

  it("shows 'Unpin' for pinned projects", async () => {
    const project = makeProject({ pinned: true });
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={noop} />,
    );
    await expect.poll(() => findMenuItem("Unpin")).toBeDefined();
    expect(findMenuItem("Pin to top")).toBeUndefined();
  });

  it("calls onAction('open') and onClose when Open is clicked", async () => {
    const project = makeProject();
    const onAction = vi.fn();
    const onClose = vi.fn();
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={onClose} onAction={onAction} />,
    );
    await expect.poll(() => findMenuItem("Open")).toBeDefined();
    const item = findMenuItem("Open");
    item?.click();
    expect(onAction).toHaveBeenCalledWith("open");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onAction('rename') when Rename is clicked", async () => {
    const project = makeProject();
    const onAction = vi.fn();
    const onClose = vi.fn();
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={onClose} onAction={onAction} />,
    );
    await expect.poll(() => findMenuItem("Rename")).toBeDefined();
    findMenuItem("Rename")?.click();
    expect(onAction).toHaveBeenCalledWith("rename");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onAction('delete') when Delete is clicked", async () => {
    const project = makeProject();
    const onAction = vi.fn();
    const onClose = vi.fn();
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={onClose} onAction={onAction} />,
    );
    await expect.poll(() => findMenuItem("Delete")).toBeDefined();
    findMenuItem("Delete")?.click();
    expect(onAction).toHaveBeenCalledWith("delete");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onAction('pin-toggle') for the Pin item", async () => {
    const project = makeProject({ pinned: false });
    const onAction = vi.fn();
    await render(
      <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={onAction} />,
    );
    await expect.poll(() => findMenuItem("Pin to top")).toBeDefined();
    findMenuItem("Pin to top")?.click();
    expect(onAction).toHaveBeenCalledWith("pin-toggle");
  });

  it("renders nothing when open is false", async () => {
    const project = makeProject();
    await render(
      <ProjectCardContextMenu
        open={false}
        position={{ x: 0, y: 0 }}
        project={project}
        onClose={noop}
        onAction={noop}
      />,
    );
    expect(getBodyText()).not.toContain("Open");
  });

  // -- Keyboard ---------------------------------------------------------------

  describe("keyboard", () => {
    it("Esc closes the menu", async () => {
      const project = makeProject();
      const onClose = vi.fn();
      await render(
        <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={onClose} onAction={noop} />,
      );
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
      await userEvent.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalled();
    });

    it("ArrowDown moves focus to the next item", async () => {
      const project = makeProject();
      await render(
        <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={noop} />,
      );
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
      const first = findMenuItem("Open");
      first?.focus();
      await expect.poll(() => document.activeElement).toBe(first);
      await userEvent.keyboard("{ArrowDown}");
      const second = findMenuItem("Rename");
      await expect.poll(() => document.activeElement).toBe(second);
    });

    it("Enter activates the focused item", async () => {
      const project = makeProject();
      const onAction = vi.fn();
      await render(
        <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={onAction} />,
      );
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
      findMenuItem("Open")?.focus();
      await userEvent.keyboard("{Enter}");
      expect(onAction).toHaveBeenCalledWith("open");
    });

    it("ArrowUp from the first item wraps to the last", async () => {
      const project = makeProject();
      await render(
        <ProjectCardContextMenu open position={{ x: 0, y: 0 }} project={project} onClose={noop} onAction={noop} />,
      );
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
      const first = findMenuItem("Open");
      first?.focus();
      await expect.poll(() => document.activeElement).toBe(first);
      await userEvent.keyboard("{ArrowUp}");
      const last = findMenuItem("Delete");
      await expect.poll(() => document.activeElement).toBe(last);
    });

    it("closes when the user clicks outside the menu", async () => {
      const project = makeProject();
      const onClose = vi.fn();
      await render(
        <>
          <div data-testid="outside" style={{ width: 200, height: 200 }}>
            outside area
          </div>
          <ProjectCardContextMenu
            open
            position={{ x: 50, y: 50 }}
            project={project}
            onClose={onClose}
            onAction={noop}
          />
        </>,
      );
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
      const outside = document.querySelector<HTMLElement>("[data-testid='outside']");
      expect(outside).not.toBeNull();
      outside?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(onClose).toHaveBeenCalled();
    });

    it("does not close when the user clicks inside the menu", async () => {
      const project = makeProject();
      const onClose = vi.fn();
      await render(
        <ProjectCardContextMenu open position={{ x: 50, y: 50 }} project={project} onClose={onClose} onAction={noop} />,
      );
      await expect.poll(() => findMenuItem("Open")).toBeDefined();
      const inside = findMenuItem("Open");
      inside?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
