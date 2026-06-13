import { userEvent } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { NewProjectCard } from "@/ui/library/new-project-card";
import { render } from "@/test/render";

// -- Helpers ------------------------------------------------------------------

function dispatchDragEvent(target: Element, type: string, files: File[] = []) {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
}

// -- Tests --------------------------------------------------------------------

describe("NewProjectCard", () => {
  it("renders the New project label and plus icon", async () => {
    const screen = await render(<NewProjectCard onFile={() => {}} />);
    await expect.element(screen.getByText("New project")).toBeInTheDocument();
    await expect.element(screen.getByText("Drop or click")).toBeInTheDocument();
    expect(screen.container.querySelector("svg")).not.toBeNull();
  });

  it("opens the file picker when the card is clicked", async () => {
    const screen = await render(<NewProjectCard onFile={() => {}} />);
    const card = screen.getByRole("button", { name: /New project/ }).element() as HTMLButtonElement;
    const input = screen.container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    card.click();
    expect(clickSpy).toHaveBeenCalled();
  });

  it("invokes onFile when an audio file is dropped on the card", async () => {
    const onFile = vi.fn();
    const screen = await render(<NewProjectCard onFile={onFile} />);
    const card = screen.getByRole("button", { name: /New project/ }).element() as HTMLButtonElement;
    const file = new File([new Uint8Array([1, 2, 3])], "drop.mp3", { type: "audio/mpeg" });
    dispatchDragEvent(card, "drop", [file]);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("ignores non-audio files dropped on the card", async () => {
    const onFile = vi.fn();
    const screen = await render(<NewProjectCard onFile={onFile} />);
    const card = screen.getByRole("button", { name: /New project/ }).element() as HTMLButtonElement;
    const file = new File(["txt"], "notes.txt", { type: "text/plain" });
    dispatchDragEvent(card, "drop", [file]);
    expect(onFile).not.toHaveBeenCalled();
  });

  it("opens the file picker when Enter is pressed on a focused card", async () => {
    const screen = await render(<NewProjectCard onFile={() => {}} />);
    const card = screen.getByRole("button", { name: /New project/ }).element() as HTMLButtonElement;
    const input = screen.container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    card.focus();
    await expect.poll(() => document.activeElement).toBe(card);
    await userEvent.keyboard("{Enter}");
    expect(clickSpy).toHaveBeenCalled();
  });
});
