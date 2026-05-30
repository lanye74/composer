import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "@/test/render";
import { RomanizationBanner } from "@/views/edit/romanization-banner";

// -- Helpers ------------------------------------------------------------------

function noop(): void {
  return;
}

// -- Tests --------------------------------------------------------------------

describe("RomanizationBanner", () => {
  it("renders the banner with detected script and line count", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={5} onPick={noop} onDismiss={noop} />,
    );

    await expect.element(screen.getByRole("region", { name: /romanization/i })).toBeInTheDocument();
    expect(screen.container.textContent).toContain("Japanese");
    expect(screen.container.textContent).toContain("5 lines");
  });

  it("uses singular wording for one detected line", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="chinese" detectedLineCount={1} onPick={noop} onDismiss={noop} />,
    );
    expect(screen.container.textContent).toContain("1 line");
    expect(screen.container.textContent).not.toContain("1 lines");
  });

  it("renders nothing when detected script is latin", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="latin" detectedLineCount={0} onPick={noop} onDismiss={noop} />,
    );
    expect(screen.container.firstChild).toBeNull();
  });

  it("renders nothing when detected line count is zero", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={0} onPick={noop} onDismiss={noop} />,
    );
    expect(screen.container.firstChild).toBeNull();
  });

  it("invokes onPick with the default scheme for the detected script", async () => {
    const onPick = vi.fn();
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={3} onPick={onPick} onDismiss={noop} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /generate/i }).element());

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("ja-Latn-hepburn");
  });

  it("invokes onPick with the user-selected scheme", async () => {
    const onPick = vi.fn();
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={3} onPick={onPick} onDismiss={noop} />,
    );

    const select = screen.getByLabelText(/romanization scheme/i);
    await userEvent.selectOptions(select.element(), "ja-Latn-kunrei");
    await userEvent.click(screen.getByRole("button", { name: /generate/i }).element());

    expect(onPick).toHaveBeenCalledWith("ja-Latn-kunrei");
  });

  it("invokes onDismiss when the dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={2} onPick={noop} onDismiss={onDismiss} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }).element());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("offers chinese-only schemes for chinese script", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="chinese" detectedLineCount={2} onPick={noop} onDismiss={noop} />,
    );
    const select = screen.getByLabelText(/romanization scheme/i);
    const options = Array.from(select.element().querySelectorAll("option")).map((o) => (o as HTMLOptionElement).value);
    expect(options).toContain("zh-Latn-pinyin");
    expect(options).toContain("zh-Latn-wadegiles");
    expect(options).not.toContain("ja-Latn-hepburn");
  });

  it("shows progress text when generating", async () => {
    const screen = await render(
      <RomanizationBanner
        detectedScript="japanese"
        detectedLineCount={10}
        onPick={noop}
        onDismiss={noop}
        progress={{ done: 4, total: 10 }}
      />,
    );
    expect(screen.container.textContent).toContain("40%");
  });

  it("disables generate while progress is provided", async () => {
    const onPick = vi.fn();
    const screen = await render(
      <RomanizationBanner
        detectedScript="japanese"
        detectedLineCount={10}
        onPick={onPick}
        onDismiss={noop}
        progress={{ done: 4, total: 10 }}
      />,
    );
    const generateButton = screen.getByRole("button", { name: /generating/i });
    await expect.element(generateButton).toBeDisabled();
  });
});

describe("RomanizationBanner invariants", () => {
  it("is keyboard reachable via the generate and dismiss buttons", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={2} onPick={noop} onDismiss={noop} />,
    );

    const generate = screen.getByRole("button", { name: /generate/i }).element() as HTMLButtonElement;
    const dismiss = screen.getByRole("button", { name: /dismiss/i }).element() as HTMLButtonElement;

    expect(generate.tabIndex).toBeGreaterThanOrEqual(0);
    expect(dismiss.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it("uses an accessible region with a label", async () => {
    const screen = await render(
      <RomanizationBanner detectedScript="japanese" detectedLineCount={2} onPick={noop} onDismiss={noop} />,
    );
    const region = screen.getByRole("region", { name: /romanization/i }).element();
    expect(region.getAttribute("aria-label")).toBeTruthy();
  });
});
