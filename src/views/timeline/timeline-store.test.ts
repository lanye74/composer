import { beforeEach, describe, expect, it } from "vitest";
import { INITIAL_STATE, useProjectStore } from "@/stores/project";
import { useTimelineStore } from "@/views/timeline/timeline-store";

describe("rollingEditMode", () => {
  it("defaults to off and toggles", () => {
    useTimelineStore.setState({ rollingEditMode: false });
    expect(useTimelineStore.getState().rollingEditMode).toBe(false);
    useTimelineStore.getState().toggleRollingEditMode();
    expect(useTimelineStore.getState().rollingEditMode).toBe(true);
  });
});

describe("timeline-store: primaryWordText", () => {
  beforeEach(() => {
    useProjectStore.setState(INITIAL_STATE);
    useTimelineStore.setState({ primaryWordText: "source" });
  });

  it("defaults to 'source'", () => {
    expect(useTimelineStore.getState().primaryWordText).toBe("source");
  });

  it("setPrimaryWordText('romaji') updates the timeline store getter", () => {
    useTimelineStore.getState().setPrimaryWordText("romaji");
    expect(useTimelineStore.getState().primaryWordText).toBe("romaji");
  });

  it("setPrimaryWordText writes through to project metadata.timelinePrimaryWordText", () => {
    useTimelineStore.getState().setPrimaryWordText("romaji");
    expect(useProjectStore.getState().metadata.timelinePrimaryWordText).toBe("romaji");
  });

  it("setting metadata.timelinePrimaryWordText externally mirrors into the timeline store", () => {
    const m = useProjectStore.getState().metadata;
    useProjectStore.getState().setMetadata({ ...m, timelinePrimaryWordText: "romaji" });
    expect(useTimelineStore.getState().primaryWordText).toBe("romaji");
  });

  it("loading a project that has no timelinePrimaryWordText falls back to 'source'", () => {
    useProjectStore.getState().setMetadata({ timelinePrimaryWordText: "romaji" });
    expect(useTimelineStore.getState().primaryWordText).toBe("romaji");
    useProjectStore.getState().setMetadata({ timelinePrimaryWordText: undefined });
    expect(useTimelineStore.getState().primaryWordText).toBe("source");
  });

  it("toggling source -> romaji -> source works", () => {
    useTimelineStore.getState().setPrimaryWordText("romaji");
    expect(useTimelineStore.getState().primaryWordText).toBe("romaji");
    useTimelineStore.getState().setPrimaryWordText("source");
    expect(useTimelineStore.getState().primaryWordText).toBe("source");
    expect(useProjectStore.getState().metadata.timelinePrimaryWordText).toBe("source");
  });
});
