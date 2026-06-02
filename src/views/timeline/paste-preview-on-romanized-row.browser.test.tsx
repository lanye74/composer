import { beforeEach, describe, expect, it } from "vitest";
import { useEffect, useRef, useState } from "react";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { createLine, createWord } from "@/test/factories";
import { render } from "@/test/render";
import { ROMAJI_BAND_HEIGHT } from "@/views/timeline/get-effective-line-main-height";
import { PastePreview } from "@/views/timeline/paste-preview";
import type { ClipboardData } from "@/views/timeline/selection-types";
import { GUTTER_WIDTH, useTimelineStore, WAVEFORM_HEIGHT } from "@/views/timeline/timeline-store";

// -- Constants ----------------------------------------------------------------

const ZOOM = 100;
const ROW_HEIGHT = 44;
const HARNESS_WIDTH = 800;
const HARNESS_HEIGHT = 600;

// -- Helpers ------------------------------------------------------------------

interface HarnessProps {
  clipboard: ClipboardData;
  onContainerReady: (rect: DOMRect) => void;
}

function PastePreviewHarness({ clipboard, onContainerReady }: HarnessProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setReady(true);
    onContainerReady(el.getBoundingClientRect());
  }, [onContainerReady]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: HARNESS_WIDTH,
        height: HARNESS_HEIGHT,
        overflow: "auto",
      }}
    >
      <div style={{ width: 2000, height: 2000 }} data-testid="paste-content" />
      {ready && <PastePreview clipboard={clipboard} scrollContainerRef={ref} />}
    </div>
  );
}

function moveMouseTo(clientX: number, clientY: number): void {
  document.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY, bubbles: true }));
}

// -- Tests --------------------------------------------------------------------

describe("PastePreview ghost on a romanized timeline row", () => {
  beforeEach(() => {
    useAudioStore.setState({ duration: 30 });
    useTimelineStore.setState({
      zoom: ZOOM,
      rowHeights: {},
      defaultRowHeight: ROW_HEIGHT,
      collapsedInstances: {},
      pasteMode: { status: "idle" },
      selectedWords: [],
    });
    useProjectStore.setState({
      lines: [
        createLine({
          id: "L-romanized",
          text: "夜だけど",
          words: [createWord({ text: "夜", begin: 0, end: 1 }), createWord({ text: "だけど", begin: 1, end: 2 })],
          romanization: {
            text: "yoru dakedo",
            source: "generated",
            wordTexts: ["yoru", "dakedo"],
          },
        }),
        createLine({
          id: "L-next",
          text: "next line",
          words: [createWord({ text: "next", begin: 5, end: 6 })],
        }),
      ],
    });
  });

  function findGhostByText(container: Element, text: string): HTMLElement | null {
    return (
      Array.from(container.querySelectorAll<HTMLElement>("div.absolute.rounded-xl")).find((el) =>
        el.textContent?.includes(text),
      ) ?? null
    );
  }

  it("sizes the ghost height to the bumped main band (base + romaji) over a romanized line", async () => {
    const clipboard: ClipboardData = {
      entries: [{ word: { text: "paste", begin: 10, end: 11 }, lineOffset: 0, trackType: "word" }],
    };
    const holder: { rect: DOMRect | null } = { rect: null };
    const captureRect = (r: DOMRect) => {
      holder.rect = r;
    };
    const screen = await render(<PastePreviewHarness clipboard={clipboard} onContainerReady={captureRect} />);
    await expect.poll(() => holder.rect).not.toBeNull();
    const rect = holder.rect as unknown as DOMRect;
    if (!rect) throw new Error("container rect missing");

    const hoverX = rect.left + GUTTER_WIDTH + 50;
    const hoverY = rect.top + WAVEFORM_HEIGHT + 10;
    moveMouseTo(hoverX, hoverY);

    await expect.poll(() => findGhostByText(screen.container, "paste")).not.toBeNull();
    const ghost = findGhostByText(screen.container, "paste");
    expect(ghost).not.toBeNull();
    if (!ghost) return;

    expect(ghost.style.height).toBe(`${ROW_HEIGHT + ROMAJI_BAND_HEIGHT - 8}px`);
  });

  it("positions the ghost top inside the romanized row's main band, not overlapping the next row", async () => {
    const clipboard: ClipboardData = {
      entries: [{ word: { text: "paste", begin: 10, end: 11 }, lineOffset: 0, trackType: "word" }],
    };
    const holder: { rect: DOMRect | null } = { rect: null };
    const captureRect = (r: DOMRect) => {
      holder.rect = r;
    };
    const screen = await render(<PastePreviewHarness clipboard={clipboard} onContainerReady={captureRect} />);
    await expect.poll(() => holder.rect).not.toBeNull();
    const rect = holder.rect as unknown as DOMRect;
    if (!rect) throw new Error("container rect missing");

    const hoverX = rect.left + GUTTER_WIDTH + 50;
    const hoverY = rect.top + WAVEFORM_HEIGHT + 10;
    moveMouseTo(hoverX, hoverY);

    await expect.poll(() => findGhostByText(screen.container, "paste")).not.toBeNull();
    const ghost = findGhostByText(screen.container, "paste");
    expect(ghost).not.toBeNull();
    if (!ghost) return;

    const ghostTop = Number.parseFloat(ghost.style.top);
    const ghostHeight = Number.parseFloat(ghost.style.height);
    const ghostBottom = ghostTop + ghostHeight;

    const nextRowTopY = WAVEFORM_HEIGHT + ROW_HEIGHT + ROMAJI_BAND_HEIGHT + ROW_HEIGHT + 1 + 4;
    expect(ghostBottom).toBeLessThanOrEqual(nextRowTopY);
    expect(ghostTop).toBeGreaterThanOrEqual(WAVEFORM_HEIGHT);
  });

  it("sizes the ghost height to the base row height (no romaji) when hovering a plain line", async () => {
    const clipboard: ClipboardData = {
      entries: [{ word: { text: "paste", begin: 10, end: 11 }, lineOffset: 0, trackType: "word" }],
    };
    const holder: { rect: DOMRect | null } = { rect: null };
    const captureRect = (r: DOMRect) => {
      holder.rect = r;
    };
    const screen = await render(<PastePreviewHarness clipboard={clipboard} onContainerReady={captureRect} />);
    await expect.poll(() => holder.rect).not.toBeNull();
    const rect = holder.rect as unknown as DOMRect;
    if (!rect) throw new Error("container rect missing");

    const plainRowTopOffset = WAVEFORM_HEIGHT + ROW_HEIGHT + ROMAJI_BAND_HEIGHT + ROW_HEIGHT + 1 + 5;
    const hoverX = rect.left + GUTTER_WIDTH + 50;
    const hoverY = rect.top + plainRowTopOffset;
    moveMouseTo(hoverX, hoverY);

    await expect.poll(() => findGhostByText(screen.container, "paste")).not.toBeNull();
    const ghost = findGhostByText(screen.container, "paste");
    expect(ghost).not.toBeNull();
    if (!ghost) return;

    expect(ghost.style.height).toBe(`${ROW_HEIGHT - 8}px`);
  });
});
