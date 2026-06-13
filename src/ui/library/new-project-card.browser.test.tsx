import { userEvent } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { NewProjectCard } from "@/ui/library/new-project-card";
import { render } from "@/test/render";

// -- Tests --------------------------------------------------------------------

describe("NewProjectCard", () => {
  it("renders the New project label and plus icon", async () => {
    const screen = await render(<NewProjectCard onClick={() => {}} />);
    await expect.element(screen.getByText("New project")).toBeInTheDocument();
    await expect.element(screen.getByText("Drop or click")).toBeInTheDocument();
    expect(screen.container.querySelector("svg")).not.toBeNull();
  });

  it("calls onClick when the card is clicked", async () => {
    const onClick = vi.fn();
    const screen = await render(<NewProjectCard onClick={onClick} />);
    await screen.getByRole("button", { name: /New project/ }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates onClick when Enter is pressed on a focused card", async () => {
    const onClick = vi.fn();
    const screen = await render(<NewProjectCard onClick={onClick} />);
    const button = screen.getByRole("button", { name: /New project/ }).element() as HTMLButtonElement;
    button.focus();
    await expect.poll(() => document.activeElement).toBe(button);
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });
});
