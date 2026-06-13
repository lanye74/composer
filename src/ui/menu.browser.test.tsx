import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { MenuContainer, MenuDivider, MenuItem } from "@/ui/menu";
import { render } from "@/test/render";

// -- Tests --------------------------------------------------------------------

describe("Menu primitives", () => {
  describe("MenuItem", () => {
    it("renders the label and calls onClick", async () => {
      const onClick = vi.fn();
      const screen = await render(<MenuItem label="Open" onClick={onClick} />);
      await screen.getByRole("menuitem", { name: "Open" }).click();
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("renders shortcut badges when shortcut is provided", async () => {
      const screen = await render(<MenuItem label="Duplicate" onClick={() => {}} shortcut={["Mod", "D"]} />);
      const item = screen.getByRole("menuitem", { name: /Duplicate/ }).element() as HTMLElement;
      const badges = item.querySelectorAll("span > span");
      expect(badges.length).toBe(2);
    });

    it("does not render the shortcut wrapper when shortcut is empty", async () => {
      const screen = await render(<MenuItem label="Open" onClick={() => {}} shortcut={[]} />);
      const item = screen.getByRole("menuitem", { name: "Open" }).element() as HTMLElement;
      expect(item.querySelectorAll("span > span").length).toBe(0);
    });

    it("applies danger styling when danger is true", async () => {
      const screen = await render(<MenuItem label="Delete" onClick={() => {}} danger />);
      const item = screen.getByRole("menuitem", { name: "Delete" }).element() as HTMLElement;
      expect(item.className).toContain("text-composer-error");
    });

    it("applies selected styling when selected is true", async () => {
      const screen = await render(<MenuItem label="Active" onClick={() => {}} selected />);
      const item = screen.getByRole("menuitem", { name: "Active" }).element() as HTMLElement;
      expect(item.className).toContain("bg-composer-accent/15");
    });

    it("is keyboard activatable", async () => {
      const onClick = vi.fn();
      const screen = await render(<MenuItem label="Hit" onClick={onClick} />);
      const item = screen.getByRole("menuitem", { name: "Hit" }).element() as HTMLElement;
      item.focus();
      await expect.poll(() => document.activeElement).toBe(item);
      await userEvent.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe("MenuDivider", () => {
    it("renders an aria separator", async () => {
      const screen = await render(<MenuDivider />);
      const separator = screen.container.querySelector('[role="separator"]');
      expect(separator).not.toBeNull();
    });
  });

  describe("MenuContainer", () => {
    it("renders children inside a menu panel", async () => {
      const screen = await render(
        <MenuContainer>
          <MenuItem label="One" onClick={() => {}} />
          <MenuDivider />
          <MenuItem label="Two" onClick={() => {}} />
        </MenuContainer>,
      );
      expect(screen.container.querySelectorAll('[role="menuitem"]').length).toBe(2);
      expect(screen.container.querySelector('[role="separator"]')).not.toBeNull();
    });

    it("applies the canonical panel classes", async () => {
      const screen = await render(
        <MenuContainer>
          <MenuItem label="One" onClick={() => {}} />
        </MenuContainer>,
      );
      const panel = screen.container.firstElementChild as HTMLElement;
      expect(panel.className).toContain("bg-composer-bg");
      expect(panel.className).toContain("border-composer-border");
      expect(panel.className).toContain("rounded-lg");
      expect(panel.className).toContain("shadow-2xl");
    });

    it("accepts an extra className override", async () => {
      const screen = await render(
        <MenuContainer className="custom-extra">
          <MenuItem label="One" onClick={() => {}} />
        </MenuContainer>,
      );
      const panel = screen.container.firstElementChild as HTMLElement;
      expect(panel.className).toContain("custom-extra");
    });
  });
});
