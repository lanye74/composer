import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { RomanizationSection } from "@/ui/help-sections/romanization";

// -- Tests --------------------------------------------------------------------

describe("RomanizationSection", () => {
  it("explains what romanization is", async () => {
    const screen = await render(<RomanizationSection />);
    await expect
      .element(
        screen.getByText(
          "Romanization shows a Latin-script reading under the source lyrics. Useful for non-Latin scripts your listeners can't read: Japanese, Chinese, and so on.",
        ),
      )
      .toBeInTheDocument();
  });

  it("lists the supported Japanese schemes", async () => {
    const screen = await render(<RomanizationSection />);
    await expect.element(screen.getByText("Japanese: Hepburn (default), Kunrei, Nihon-shiki.")).toBeInTheDocument();
  });

  it("notes Chinese pinyin support with a Wade-Giles fallback", async () => {
    const screen = await render(<RomanizationSection />);
    await expect
      .element(screen.getByText("Chinese: Pinyin. Wade-Giles is supported as a best-effort fallback."))
      .toBeInTheDocument();
  });

  it("explains the banner-driven enablement", async () => {
    const screen = await render(<RomanizationSection />);
    expect(screen.container.textContent).toContain("banner appears in Edit");
  });

  it("describes generated vs manual sources", async () => {
    const screen = await render(<RomanizationSection />);
    expect(screen.container.textContent).toContain("Generated");
    expect(screen.container.textContent).toContain("Manual");
    expect(screen.container.textContent).toContain("won't overwrite manual romaji");
  });

  it("documents the TTML round-trip via transliterations", async () => {
    const screen = await render(<RomanizationSection />);
    expect(screen.container.textContent).toContain("<transliterations>");
    expect(screen.container.textContent).toContain("re-imports");
  });

  it("describes where romaji shows in Sync and Timeline", async () => {
    const screen = await render(<RomanizationSection />);
    expect(screen.container.textContent).toContain("In Sync");
    expect(screen.container.textContent).toContain("In Timeline");
  });

  it("renders without console warnings", async () => {
    const screen = await render(<RomanizationSection />);
    expect(screen.container.querySelector("h4")).not.toBeNull();
  });
});
