import { describe, expect, it } from "vitest";
import { ScrollableLine } from "@/views/sync/scrollable-line";
import { render } from "@/test/render";

const BASE_PROPS = {
  lineId: "test-line",
  text: "Hello world",
  lineNumber: 0,
  isCurrent: false,
  granularity: "word" as const,
  currentTime: 0,
  editMode: false,
  onClick: () => {},
};

describe("ScrollableLine", () => {
  it("renders the line text", async () => {
    const screen = await render(<ScrollableLine {...BASE_PROPS} />);
    expect(screen.container.textContent).toContain("Hello");
    expect(screen.container.textContent).toContain("world");
  });

  it("invokes onClick when the line is clicked", async () => {
    let clicks = 0;
    const screen = await render(<ScrollableLine {...BASE_PROPS} onClick={() => clicks++} />);
    (screen.container.querySelector("div") as HTMLElement).click();
    expect(clicks).toBeGreaterThan(0);
  });

  it("shows background text alongside the main line when provided", async () => {
    const screen = await render(<ScrollableLine {...BASE_PROPS} backgroundText="(echo)" />);
    expect(screen.container.textContent).toContain("(echo)");
  });

  it("renders only the line-number gutter when text is empty", async () => {
    const screen = await render(<ScrollableLine {...BASE_PROPS} text="" />);
    expect((screen.container.textContent ?? "").trim()).toBe(String(BASE_PROPS.lineNumber));
  });
});

describe("ScrollableLine romanization reference", () => {
  it("renders the romanization text when scheme is set and line has romanization", async () => {
    const screen = await render(
      <ScrollableLine
        {...BASE_PROPS}
        text="夜だけど"
        romanizationScheme="ja-Latn-hepburn"
        romanizationText="yoru dakedo"
      />,
    );
    expect(screen.container.textContent).toContain("yoru dakedo");
    expect(screen.container.querySelector('[data-testid="romanization-reference"]')).not.toBeNull();
  });

  it("does not render romanization when scheme is unset", async () => {
    const screen = await render(<ScrollableLine {...BASE_PROPS} text="夜だけど" romanizationText="yoru dakedo" />);
    expect(screen.container.querySelector('[data-testid="romanization-reference"]')).toBeNull();
  });

  it("does not render romanization when line has no romanization data", async () => {
    const screen = await render(
      <ScrollableLine {...BASE_PROPS} text="夜だけど" romanizationScheme="ja-Latn-hepburn" />,
    );
    expect(screen.container.querySelector('[data-testid="romanization-reference"]')).toBeNull();
  });

  it("applies accent color when the line is current", async () => {
    const screen = await render(
      <ScrollableLine
        {...BASE_PROPS}
        isCurrent
        text="夜だけど"
        romanizationScheme="ja-Latn-hepburn"
        romanizationText="yoru dakedo"
      />,
    );
    const ref = screen.container.querySelector('[data-testid="romanization-reference"]') as HTMLElement;
    expect(ref.className).toMatch(/text-composer-accent-text/);
  });

  it("applies muted color when the line is inactive", async () => {
    const screen = await render(
      <ScrollableLine
        {...BASE_PROPS}
        isCurrent={false}
        text="夜だけど"
        romanizationScheme="ja-Latn-hepburn"
        romanizationText="yoru dakedo"
      />,
    );
    const ref = screen.container.querySelector('[data-testid="romanization-reference"]') as HTMLElement;
    expect(ref.className).toMatch(/text-composer-text-muted/);
  });

  it("renders romanization below the source line, not above the background row", async () => {
    const screen = await render(
      <ScrollableLine
        {...BASE_PROPS}
        text="夜だけど"
        backgroundText="(echo)"
        romanizationScheme="ja-Latn-hepburn"
        romanizationText="yoru dakedo"
      />,
    );
    const node = screen.container.querySelector('[data-testid="romanization-reference"]') as HTMLElement;
    expect(node).not.toBeNull();
    expect(screen.container.textContent).toContain("(echo)");
    expect(screen.container.textContent).toContain("yoru dakedo");
  });

  it("does not steal pointer interactions from source words", async () => {
    const screen = await render(
      <ScrollableLine
        {...BASE_PROPS}
        text="夜だけど"
        romanizationScheme="ja-Latn-hepburn"
        romanizationText="yoru dakedo"
      />,
    );
    const ref = screen.container.querySelector('[data-testid="romanization-reference"]') as HTMLElement;
    expect(ref.className).toMatch(/pointer-events-none/);
  });
});
