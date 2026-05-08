import type { Agent, LinkGroup, ProjectMetadata } from "@/stores/project";
import { generateTTML } from "@/utils/ttml";
import { describe, expect, it } from "vitest";

const baseMetadata: ProjectMetadata = { title: "Test", artist: "", album: "", duration: 60 };
const baseAgents: Agent[] = [{ id: "v1", type: "person", name: "Lead" }];

describe("ttml export · groups registry", () => {
  it("emits composer:groups when project has groups", () => {
    const groups: LinkGroup[] = [{ id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 1 }];
    const ttml = generateTTML({
      metadata: baseMetadata,
      agents: baseAgents,
      lines: [],
      groups,
      granularity: "word",
    });

    expect(ttml).toContain("<composer:groups>");
    expect(ttml).toContain('id="g1"');
    expect(ttml).toContain('label="Chorus"');
    expect(ttml).toContain('color="#f472b6"');
    expect(ttml).toContain('templateVersion="1"');
    expect(ttml).toContain("</composer:groups>");
  });

  it("emits multiple groups in order", () => {
    const groups: LinkGroup[] = [
      { id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 2 },
      { id: "g2", label: "Verse", color: "#60a5fa", templateVersion: 1 },
    ];
    const ttml = generateTTML({ metadata: baseMetadata, agents: baseAgents, lines: [], groups, granularity: "word" });

    const i1 = ttml.indexOf('id="g1"');
    const i2 = ttml.indexOf('id="g2"');
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(ttml).toContain('label="Verse"');
  });

  it("escapes label and color values", () => {
    const groups: LinkGroup[] = [
      { id: "g1", label: "Pre & Post", color: "#aaaaaa", templateVersion: 1 },
    ];
    const ttml = generateTTML({ metadata: baseMetadata, agents: baseAgents, lines: [], groups, granularity: "word" });

    expect(ttml).toContain('label="Pre &amp; Post"');
  });

  it("omits the registry block when groups is undefined", () => {
    const ttml = generateTTML({ metadata: baseMetadata, agents: baseAgents, lines: [], granularity: "word" });
    expect(ttml).not.toContain("<composer:groups>");
  });

  it("omits the registry block when groups is empty", () => {
    const ttml = generateTTML({
      metadata: baseMetadata,
      agents: baseAgents,
      lines: [],
      groups: [],
      granularity: "word",
    });
    expect(ttml).not.toContain("<composer:groups>");
  });
});

describe("ttml export · per-line group attrs", () => {
  const groups: LinkGroup[] = [{ id: "g1", label: "Chorus", color: "#f472b6", templateVersion: 1 }];

  function syncedLine(id: string, extras: Partial<{ groupId: string; instanceIdx: number; templateLineIdx: number; detached: boolean }>) {
    return {
      id,
      text: "hello",
      agentId: "v1",
      begin: 0,
      end: 1,
      ...extras,
    };
  }

  it("emits composer:groupId/instanceIdx/templateLineIdx on grouped lines", () => {
    const ttml = generateTTML({
      metadata: baseMetadata,
      agents: baseAgents,
      lines: [syncedLine("a", { groupId: "g1", instanceIdx: 2, templateLineIdx: 0 })],
      groups,
      granularity: "line",
    });

    expect(ttml).toContain('composer:groupId="g1"');
    expect(ttml).toContain('composer:instanceIdx="2"');
    expect(ttml).toContain('composer:templateLineIdx="0"');
  });

  it("omits group attrs on standalone lines", () => {
    const ttml = generateTTML({
      metadata: baseMetadata,
      agents: baseAgents,
      lines: [syncedLine("a", {})],
      groups: [],
      granularity: "line",
    });

    expect(ttml).not.toContain("composer:groupId");
    expect(ttml).not.toContain("composer:instanceIdx");
  });

  it("emits composer:detached only when true", () => {
    const t1 = generateTTML({
      metadata: baseMetadata,
      agents: baseAgents,
      lines: [syncedLine("a", { groupId: "g1", instanceIdx: 0, templateLineIdx: 0, detached: true })],
      groups,
      granularity: "line",
    });
    expect(t1).toContain('composer:detached="true"');

    const t2 = generateTTML({
      metadata: baseMetadata,
      agents: baseAgents,
      lines: [syncedLine("b", { groupId: "g1", instanceIdx: 0, templateLineIdx: 0, detached: false })],
      groups,
      granularity: "line",
    });
    expect(t2).not.toContain("composer:detached");
  });
});

