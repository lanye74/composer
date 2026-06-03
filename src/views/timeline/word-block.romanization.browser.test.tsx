import { describe, expect, it } from "vitest";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { WordBlock } from "@/views/timeline/word-block";
import { render } from "@/test/render";

const BASE_PROPS = {
  id: "wb-1",
  lineId: "line-1",
  lineIndex: 0,
  wordIndex: 0,
  trackType: "word" as const,
  text: "夜",
  begin: 0,
  end: 1,
  color: "#a3c9ff",
  zoom: 50,
  isDimmed: false,
  isSelected: false,
  onClick: () => {},
  onResizeStart: () => {},
};

// -- Tests --------------------------------------------------------------------

describe("WordBlock romanization subtext", () => {
  it("renders the romaji subtext under the source text when wide enough", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    const node = screen.container.querySelector('[data-testid="word-romanization"]') as HTMLElement;
    expect(node).not.toBeNull();
    expect(node.textContent).toBe("yoru");
  });

  it("uses italic style for the romaji subtext", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    const node = screen.container.querySelector('[data-testid="word-romanization"]') as HTMLElement;
    expect(node.className).toMatch(/italic/);
  });

  it("does not render the subtext when romanization is undefined", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} />, { dndContext: true });
    expect(screen.container.querySelector('[data-testid="word-romanization"]')).toBeNull();
  });

  it("does not render the subtext when romanization text is empty", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="" />, { dndContext: true });
    expect(screen.container.querySelector('[data-testid="word-romanization"]')).toBeNull();
  });

  it("hides the subtext when the block is too narrow", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} begin={0} end={0.4} romanization="yoru" />, {
      dndContext: true,
    });
    expect(screen.container.querySelector('[data-testid="word-romanization"]')).toBeNull();
  });

  it("truncates with ellipsis when the romaji text overflows", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru dakedo tomodachi" />, {
      dndContext: true,
    });
    const node = screen.container.querySelector('[data-testid="word-romanization"]') as HTMLElement;
    expect(node).not.toBeNull();
    expect(node.className).toMatch(/truncate|text-ellipsis/);
  });

  it("does not steal pointer events from the source word block", async () => {
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    const node = screen.container.querySelector('[data-testid="word-romanization"]') as HTMLElement;
    expect(node.className).toMatch(/pointer-events-none/);
  });

  it("still hits the source word block when clicking", async () => {
    let clicks = 0;
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" onClick={() => clicks++} />, {
      dndContext: true,
    });
    const block = screen.container.querySelector("[data-word-block]") as HTMLElement;
    block.click();
    expect(clicks).toBe(1);
  });
});

// -- Primary text toggle ------------------------------------------------------

describe("WordBlock primary text toggle", () => {
  function getPrimary(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-testid="word-primary"]') as HTMLElement;
  }
  function getSubtext(container: HTMLElement): HTMLElement | null {
    return container.querySelector('[data-testid="word-romanization"]');
  }

  it("renders source as primary and romaji as subtext by default", async () => {
    useTimelineStore.setState({ primaryWordText: "source" });
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    expect(getPrimary(screen.container).textContent).toBe("夜");
    expect(getSubtext(screen.container)?.textContent).toBe("yoru");
  });

  it("renders romaji as primary and source as subtext when toggled", async () => {
    useTimelineStore.setState({ primaryWordText: "romaji" });
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    expect(getPrimary(screen.container).textContent).toBe("yoru");
    expect(getSubtext(screen.container)?.textContent).toBe("夜");
  });

  it("falls back to source as primary when romaji is requested but no per-word romanization exists", async () => {
    useTimelineStore.setState({ primaryWordText: "romaji" });
    const screen = await render(<WordBlock {...BASE_PROPS} />, { dndContext: true });
    expect(getPrimary(screen.container).textContent).toBe("夜");
    expect(getSubtext(screen.container)).toBeNull();
  });

  it("falls back to source as primary when romanization prop is an empty string", async () => {
    useTimelineStore.setState({ primaryWordText: "romaji" });
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="" />, { dndContext: true });
    expect(getPrimary(screen.container).textContent).toBe("夜");
    expect(getSubtext(screen.container)).toBeNull();
  });

  it("does not change the outer wrapper element across source and romaji modes", async () => {
    useTimelineStore.setState({ primaryWordText: "source" });
    const sourceScreen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    const sourceBlock = sourceScreen.container.querySelector("[data-word-block]") as HTMLElement;
    const sourceTag = sourceBlock.tagName;
    const sourceWidth = sourceBlock.style.width;
    const sourceHeight = sourceBlock.style.height;
    await sourceScreen.unmount();

    useTimelineStore.setState({ primaryWordText: "romaji" });
    const romajiScreen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    const romajiBlock = romajiScreen.container.querySelector("[data-word-block]") as HTMLElement;
    expect(romajiBlock.tagName).toBe(sourceTag);
    expect(romajiBlock.style.width).toBe(sourceWidth);
    expect(romajiBlock.style.height).toBe(sourceHeight);
  });

  it("keeps the subtext slot present in romaji mode (no layout shift on swap)", async () => {
    useTimelineStore.setState({ primaryWordText: "source" });
    const screen = await render(<WordBlock {...BASE_PROPS} romanization="yoru" />, { dndContext: true });
    expect(getSubtext(screen.container)).not.toBeNull();
    useTimelineStore.getState().setPrimaryWordText("romaji");
    await expect.poll(() => getSubtext(screen.container)?.textContent).toBe("夜");
  });
});
