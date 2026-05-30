import { beforeEach, describe, expect, it } from "vitest";
import { markPersistenceSettled } from "@/lib/persistence-settled";
import { useRomanizationVisibility } from "@/hooks/useRomanizationVisibility";
import { useProjectStore } from "@/stores/project";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";

// -- Helpers ------------------------------------------------------------------

const VisibilityProbe: React.FC<{ onRender: (value: ReturnType<typeof useRomanizationVisibility>) => void }> = ({
  onRender,
}) => {
  const visibility = useRomanizationVisibility();
  onRender(visibility);
  return <span data-testid="banner-flag">{visibility.shouldShowBanner ? "show" : "hide"}</span>;
};

function seedJapaneseLines(): void {
  useProjectStore.setState({
    lines: [createLine({ id: "L1", text: "夜だけど" }), createLine({ id: "L2", text: "メモリー" })],
  });
}

// -- Tests --------------------------------------------------------------------

describe("useRomanizationVisibility persistence gate", () => {
  beforeEach(() => {
    seedJapaneseLines();
  });

  it("returns shouldShowBanner=false before persistence has settled", async () => {
    const observed: boolean[] = [];
    const screen = await render(<VisibilityProbe onRender={(v) => observed.push(v.shouldShowBanner)} />);

    await expect.element(screen.getByTestId("banner-flag")).toHaveTextContent("hide");
    expect(observed.every((flag) => flag === false)).toBe(true);
  });

  it("flips shouldShowBanner=true once persistence has settled", async () => {
    const screen = await render(<VisibilityProbe onRender={() => undefined} />);
    await expect.element(screen.getByTestId("banner-flag")).toHaveTextContent("hide");
    markPersistenceSettled();
    await expect.element(screen.getByTestId("banner-flag")).toHaveTextContent("show");
  });
});
