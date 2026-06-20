import { instanceLineFromTemplate } from "@/domain/group/instance-line";
import type { LineTemplate, LinkGroup } from "@/domain/group/template";
import type { LyricLine } from "@/domain/line/model";
import { mainWords } from "@/domain/line/voices";

interface FillResult {
  ok: boolean;
  reason?: "not_enough_empty_lines" | "out_of_range";
  updatedLines?: LyricLine[];
  newGroup?: LinkGroup;
  instanceIdx?: number;
}

interface FillInput {
  lines: LyricLine[];
  groupId: string;
  template: LineTemplate[];
  startIndex: number;
  instanceStart: number;
}

function isEmptyFillable(line: LyricLine): boolean {
  const words = mainWords(line);
  return line.groupId === undefined && (!words || words.length === 0);
}

function fillEmptyLinesWithInstance(input: FillInput): FillResult {
  const { lines, groupId, template, startIndex, instanceStart } = input;

  if (startIndex < 0 || startIndex + template.length > lines.length) {
    return { ok: false, reason: "out_of_range" };
  }

  for (let i = 0; i < template.length; i++) {
    const target = lines[startIndex + i];
    if (!isEmptyFillable(target)) {
      return { ok: false, reason: "not_enough_empty_lines" };
    }
  }

  const usedIndices = new Set(
    lines.flatMap((l) => (l.groupId === groupId && l.instanceIdx !== undefined ? [l.instanceIdx] : [])),
  );
  let instanceIdx = 0;
  while (usedIndices.has(instanceIdx)) instanceIdx++;

  const updatedLines = lines.map((line, idx) => {
    if (idx < startIndex || idx >= startIndex + template.length) return line;
    const tplLine = template[idx - startIndex];
    return instanceLineFromTemplate(tplLine, instanceStart, {
      id: line.id,
      groupId,
      instanceIdx,
      templateLineIdx: idx - startIndex,
    });
  });

  return { ok: true, updatedLines, instanceIdx };
}

export { fillEmptyLinesWithInstance, isEmptyFillable };
