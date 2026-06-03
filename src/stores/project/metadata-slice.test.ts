import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project";

describe("metadata-slice: romanization", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  it("setRomanizationScheme stores a known scheme", () => {
    useProjectStore.getState().setRomanizationScheme("ja-Latn-hepburn");
    expect(useProjectStore.getState().metadata.romanizationScheme).toBe("ja-Latn-hepburn");
  });

  it("setRomanizationScheme accepts undefined to clear", () => {
    useProjectStore.getState().setRomanizationScheme("ja-Latn-hepburn");
    useProjectStore.getState().setRomanizationScheme(undefined);
    expect(useProjectStore.getState().metadata.romanizationScheme).toBeUndefined();
  });

  it("setRomanizationScheme throws on unknown scheme", () => {
    expect(() => useProjectStore.getState().setRomanizationScheme("xx-Latn-foo")).toThrow(
      /Unknown romanization scheme/,
    );
  });

  it("setRomanizationScheme does not mark isDirtySinceHistory", () => {
    useProjectStore.getState().setRomanizationScheme("ja-Latn-hepburn");
    expect(useProjectStore.getState().isDirtySinceHistory).toBe(false);
  });

  it("setRomanizationScheme leaves the rest of metadata untouched", () => {
    useProjectStore.getState().setMetadata({ title: "Night Dancer", artist: "imase" });
    useProjectStore.getState().setRomanizationScheme("ja-Latn-hepburn");
    expect(useProjectStore.getState().metadata.title).toBe("Night Dancer");
    expect(useProjectStore.getState().metadata.artist).toBe("imase");
  });

  it("dismissRomanizationBanner persists the dismissal flag", () => {
    useProjectStore.getState().dismissRomanizationBanner();
    expect(useProjectStore.getState().metadata.romanizationBannerDismissed).toBe(true);
  });

  it("dismissRomanizationBanner does not mark isDirtySinceHistory", () => {
    useProjectStore.getState().dismissRomanizationBanner();
    expect(useProjectStore.getState().isDirtySinceHistory).toBe(false);
  });

  it("reset clears scheme and banner state", () => {
    useProjectStore.getState().setRomanizationScheme("ja-Latn-hepburn");
    useProjectStore.getState().dismissRomanizationBanner();
    useProjectStore.getState().reset();
    expect(useProjectStore.getState().metadata.romanizationScheme).toBeUndefined();
    expect(useProjectStore.getState().metadata.romanizationBannerDismissed).toBeUndefined();
  });
});

describe("metadata-slice: timelinePrimaryWordText", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  it("defaults to undefined on a fresh project", () => {
    expect(useProjectStore.getState().metadata.timelinePrimaryWordText).toBeUndefined();
  });

  it("setMetadata round-trips the timelinePrimaryWordText field", () => {
    useProjectStore.getState().setMetadata({ timelinePrimaryWordText: "romaji" });
    expect(useProjectStore.getState().metadata.timelinePrimaryWordText).toBe("romaji");
    useProjectStore.getState().setMetadata({ timelinePrimaryWordText: "source" });
    expect(useProjectStore.getState().metadata.timelinePrimaryWordText).toBe("source");
  });

  it("setMetadata leaves the rest of metadata untouched when updating timelinePrimaryWordText", () => {
    useProjectStore.getState().setMetadata({ title: "Night Dancer", artist: "imase" });
    useProjectStore.getState().setMetadata({ timelinePrimaryWordText: "romaji" });
    expect(useProjectStore.getState().metadata.title).toBe("Night Dancer");
    expect(useProjectStore.getState().metadata.artist).toBe("imase");
  });

  it("reset clears the toggle back to undefined", () => {
    useProjectStore.getState().setMetadata({ timelinePrimaryWordText: "romaji" });
    useProjectStore.getState().reset();
    expect(useProjectStore.getState().metadata.timelinePrimaryWordText).toBeUndefined();
  });
});
