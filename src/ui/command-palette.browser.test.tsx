import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { LibraryProject } from "@/domain/project/library-project";
import { putLibraryProject } from "@/lib/library-persistence";
import { CommandPalette } from "@/ui/command-palette";
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

function getInput(): HTMLInputElement {
  const el = document.querySelector('input[placeholder*="Find a project"]');
  if (!el) throw new Error("Command palette input not found");
  return el as HTMLInputElement;
}

function getBodyText(): string {
  return document.body.textContent ?? "";
}

function findItemByText(text: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll("[cmdk-item]")).find((el) => (el.textContent ?? "").includes(text)) as
    | HTMLElement
    | undefined;
}

// -- Tests --------------------------------------------------------------------

describe("CommandPalette · happy paths", () => {
  it("renders projects when open is true", async () => {
    await putLibraryProject(makeProject({ id: "alpha" }));
    await putLibraryProject(makeProject({ id: "beta" }));

    await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);

    await expect.poll(getBodyText).toContain("Title-alpha");
    expect(getBodyText()).toContain("Title-beta");
  });

  it("filters projects by typing in the search", async () => {
    await putLibraryProject(makeProject({ id: "lavender" }));
    await putLibraryProject(makeProject({ id: "pinkwhite" }));

    await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);

    await expect.poll(getBodyText).toContain("Title-lavender");

    const input = getInput();
    input.focus();
    await userEvent.keyboard("lavender");

    await expect.poll(getBodyText).not.toContain("Title-pinkwhite");
    expect(getBodyText()).toContain("Title-lavender");
  });

  it("matches by artist as well as title", async () => {
    await putLibraryProject(
      makeProject({
        id: "swift-1",
        metadata: { title: "Anti-Hero", artist: "Taylor Swift", album: "", duration: 200 },
      }),
    );
    await putLibraryProject(
      makeProject({
        id: "ocean-1",
        metadata: { title: "Pink + White", artist: "Frank Ocean", album: "", duration: 184 },
      }),
    );

    await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);

    await expect.poll(getBodyText).toContain("Anti-Hero");

    const input = getInput();
    input.focus();
    await userEvent.keyboard("Taylor");

    await expect.poll(getBodyText).not.toContain("Pink + White");
    expect(getBodyText()).toContain("Anti-Hero");
  });

  it("calls onOpenProject and closes when a project is selected", async () => {
    await putLibraryProject(makeProject({ id: "openme" }));

    const onOpen = vi.fn();
    const onOpenChange = vi.fn();
    await render(<CommandPalette open onOpenChange={onOpenChange} onOpenProject={onOpen} onCommandRun={noop} />);

    await expect.poll(getBodyText).toContain("Title-openme");

    const projectItem = findItemByText("Title-openme");
    expect(projectItem).toBeDefined();
    projectItem?.click();

    expect(onOpen).toHaveBeenCalledWith("openme");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onCommandRun and closes when a command is selected", async () => {
    const onRun = vi.fn();
    const onOpenChange = vi.fn();
    await render(<CommandPalette open onOpenChange={onOpenChange} onOpenProject={noop} onCommandRun={onRun} />);

    await expect.poll(getBodyText).toContain("Open settings");

    const target = findItemByText("Open settings");
    expect(target).toBeDefined();
    target?.click();

    expect(onRun).toHaveBeenCalledWith("open-settings");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("CommandPalette · edge cases", () => {
  it("shows the empty state when the query matches no projects or commands", async () => {
    await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);

    await expect.poll(getBodyText).toContain("Open settings");

    const input = getInput();
    input.focus();
    await userEvent.keyboard("qzqzqzqzgibberish");

    await expect.poll(getBodyText).toContain("No results.");
  });

  it("renders empty projects section gracefully when library is empty", async () => {
    const onRun = vi.fn();
    await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={onRun} />);

    await expect.poll(getBodyText).toContain("Open settings");
    expect(getBodyText()).not.toContain("Projects");

    const target = findItemByText("Help");
    expect(target).toBeDefined();
    target?.click();
    expect(onRun).toHaveBeenCalledWith("open-help");
  });

  it("closes when open is set to false", async () => {
    const screen = await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);
    await expect.poll(getBodyText).toContain("Open settings");

    screen.rerender(<CommandPalette open={false} onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);

    await expect.poll(() => document.querySelector('input[placeholder*="Find a project"]')).toBeNull();
  });
});

describe("CommandPalette · keyboard", () => {
  it("Esc closes the palette", async () => {
    const onOpenChange = vi.fn();
    await render(<CommandPalette open onOpenChange={onOpenChange} onOpenProject={noop} onCommandRun={noop} />);

    await expect.poll(() => document.querySelector('input[placeholder*="Find a project"]')).not.toBeNull();
    await expect.poll(() => document.activeElement?.tagName).toBe("INPUT");

    await userEvent.keyboard("{Escape}");

    await expect.poll(() => onOpenChange.mock.calls.some(([arg]) => arg === false)).toBe(true);
  });

  it("Enter on a highlighted item selects it", async () => {
    await putLibraryProject(makeProject({ id: "entertest" }));
    const onOpen = vi.fn();
    await render(<CommandPalette open onOpenChange={noop} onOpenProject={onOpen} onCommandRun={noop} />);

    await expect.poll(getBodyText).toContain("Title-entertest");

    const input = getInput();
    input.focus();
    await userEvent.keyboard("entertest");

    await expect
      .poll(() => {
        const selected = document.querySelector('[cmdk-item][data-selected="true"]');
        return selected?.textContent ?? "";
      })
      .toContain("Title-entertest");

    await userEvent.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledWith("entertest");
  });

  it("ArrowDown moves highlight to the next item", async () => {
    await putLibraryProject(makeProject({ id: "row-a" }));
    await putLibraryProject(makeProject({ id: "row-b" }));

    await render(<CommandPalette open onOpenChange={noop} onOpenProject={noop} onCommandRun={noop} />);
    await expect.poll(() => document.querySelectorAll("[cmdk-item]").length).toBeGreaterThan(1);
    await expect.poll(() => document.activeElement?.tagName).toBe("INPUT");

    const initialSelected = document.querySelector('[cmdk-item][data-selected="true"]');
    const initialValue = initialSelected?.getAttribute("data-value") ?? "";
    expect(initialValue).not.toBe("");

    await userEvent.keyboard("{ArrowDown}");

    await expect
      .poll(() => {
        const selected = document.querySelector('[cmdk-item][data-selected="true"]');
        return selected?.getAttribute("data-value") ?? "";
      })
      .not.toBe(initialValue);
  });
});
