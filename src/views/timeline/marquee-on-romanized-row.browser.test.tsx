import { beforeEach, describe, expect, it } from "vitest";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/stores/project";
import { createLine, createWord } from "@/test/factories";
import { render } from "@/test/render";
import { ROMAJI_BAND_HEIGHT } from "@/views/timeline/get-effective-line-main-height";
import { GUTTER_WIDTH, useTimelineStore, WAVEFORM_HEIGHT } from "@/views/timeline/timeline-store";
import { useMarquee } from "@/views/timeline/use-marquee";

// -- Constants ----------------------------------------------------------------

const ZOOM = 100;
const ROW_HEIGHT = 44;
const HARNESS_WIDTH = 800;
const HARNESS_HEIGHT = 600;

// -- Helpers ------------------------------------------------------------------

interface HarnessProps {
  onContainerReady: (rect: DOMRect) => void;
}

function MarqueeHarness({ onContainerReady }: HarnessProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { marqueeRect, handleMarqueeMouseDown } = useMarquee(ref);
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
      role="presentation"
      onMouseDown={handleMarqueeMouseDown}
      style={{
        position: "relative",
        width: HARNESS_WIDTH,
        height: HARNESS_HEIGHT,
        overflow: "auto",
      }}
    >
      <div style={{ width: 2000, height: 2000 }} data-testid="marquee-content" />
      {ready && marqueeRect && (
        <div
          data-testid="marquee-rect"
          style={{
            position: "absolute",
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
    </div>
  );
}

function dragMarquee(start: { x: number; y: number }, end: { x: number; y: number }, target: Element): void {
  target.dispatchEvent(new MouseEvent("mousedown", { button: 0, clientX: start.x, clientY: start.y, bubbles: true }));
  document.dispatchEvent(new MouseEvent("mousemove", { clientX: end.x, clientY: end.y, bubbles: true }));
  document.dispatchEvent(new MouseEvent("mouseup", { clientX: end.x, clientY: end.y, bubbles: true }));
}

// -- Tests --------------------------------------------------------------------

describe("Marquee selection on a romanized timeline row", () => {
  beforeEach(() => {
    useTimelineStore.setState({
      zoom: ZOOM,
      rowHeights: {},
      defaultRowHeight: ROW_HEIGHT,
      collapsedInstances: {},
      selectedWords: [],
    });
    useProjectStore.setState({
      lines: [
        createLine({
          id: "L1",
          text: "夜だけど",
          words: [createWord({ text: "夜", begin: 0, end: 1 }), createWord({ text: "だけど", begin: 1, end: 2 })],
          romanization: {
            text: "yoru dakedo",
            source: "generated",
            words: [
              { text: "yoru", begin: 0, end: 1 },
              { text: "dakedo", begin: 1, end: 2 },
            ],
          },
        }),
      ],
    });
  });

  it("selects only source-band words when the marquee covers the full bumped row", async () => {
    const holder: { rect: DOMRect | null } = { rect: null };
    const captureRect = (r: DOMRect) => {
      holder.rect = r;
    };
    const screen = await render(<MarqueeHarness onContainerReady={captureRect} />);
    await expect.poll(() => holder.rect).not.toBeNull();
    const rect = holder.rect as unknown as DOMRect;
    if (!rect) throw new Error("container rect missing");

    const target = screen.container.querySelector('[data-testid="marquee-content"]') as Element;
    expect(target).not.toBeNull();

    const startClientX = rect.left + GUTTER_WIDTH + 10;
    const startClientY = rect.top + WAVEFORM_HEIGHT + 2;
    const endClientX = rect.left + GUTTER_WIDTH + 2 * ZOOM + 50;
    const endClientY = rect.top + WAVEFORM_HEIGHT + ROW_HEIGHT + ROMAJI_BAND_HEIGHT - 2;

    dragMarquee({ x: startClientX, y: startClientY }, { x: endClientX, y: endClientY }, target);

    await expect
      .poll(() => useTimelineStore.getState().selectedWords.map((s) => `${s.lineId}:${s.type}:${s.wordIndex}`))
      .toEqual(["L1:word:0", "L1:word:1"]);
  });

  it("does not select anything when the marquee covers only the romaji band region", async () => {
    const holder: { rect: DOMRect | null } = { rect: null };
    const captureRect = (r: DOMRect) => {
      holder.rect = r;
    };
    const screen = await render(<MarqueeHarness onContainerReady={captureRect} />);
    await expect.poll(() => holder.rect).not.toBeNull();
    const rect = holder.rect as unknown as DOMRect;
    if (!rect) throw new Error("container rect missing");

    const target = screen.container.querySelector('[data-testid="marquee-content"]') as Element;

    const startClientX = rect.left + GUTTER_WIDTH + 5 * ZOOM;
    const startClientY = rect.top + WAVEFORM_HEIGHT + 5 * ZOOM;
    const endClientX = startClientX + 100;
    const endClientY = startClientY + 50;

    dragMarquee({ x: startClientX, y: startClientY }, { x: endClientX, y: endClientY }, target);

    await expect.poll(() => useTimelineStore.getState().selectedWords).toEqual([]);
  });

  it("treats the romaji band as part of the line's vertical hit area without selecting romaji units", async () => {
    const holder: { rect: DOMRect | null } = { rect: null };
    const captureRect = (r: DOMRect) => {
      holder.rect = r;
    };
    const screen = await render(<MarqueeHarness onContainerReady={captureRect} />);
    await expect.poll(() => holder.rect).not.toBeNull();
    const rect = holder.rect as unknown as DOMRect;
    if (!rect) throw new Error("container rect missing");

    const target = screen.container.querySelector('[data-testid="marquee-content"]') as Element;

    const startClientX = rect.left + GUTTER_WIDTH + 10;
    const startClientY = rect.top + WAVEFORM_HEIGHT + ROW_HEIGHT + 2;
    const endClientX = rect.left + GUTTER_WIDTH + 2 * ZOOM + 50;
    const endClientY = rect.top + WAVEFORM_HEIGHT + ROW_HEIGHT + ROMAJI_BAND_HEIGHT - 2;

    dragMarquee({ x: startClientX, y: startClientY }, { x: endClientX, y: endClientY }, target);

    const selected = useTimelineStore.getState().selectedWords;
    expect(selected.every((s) => s.type === "word")).toBe(true);
    expect(selected.every((s) => s.type !== ("romanization" as unknown as "word"))).toBe(true);
  });
});
