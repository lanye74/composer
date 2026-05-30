import type { LyricLine } from "@/domain/line/model";
import type { ProjectMetadata } from "@/domain/project/metadata";
import type { Script } from "@/domain/romanization/detect";
import { detectScript } from "@/domain/romanization/detect";
import { useProjectStore } from "@/stores/project";
import { useMemo } from "react";

// -- Types --------------------------------------------------------------------

interface RomanizationVisibility {
  schemeSet: boolean;
  bannerDismissed: boolean;
  dominantScript: Script;
  detectedLineCount: number;
  shouldShowBanner: boolean;
}

type MetadataLike = Partial<Pick<ProjectMetadata, "romanizationScheme" | "romanizationBannerDismissed">>;
type LineLike = Pick<LyricLine, "text">;

// -- Pure helper --------------------------------------------------------------

function computeRomanizationVisibility(lines: LineLike[], metadata: MetadataLike): RomanizationVisibility {
  const schemeSet = typeof metadata.romanizationScheme === "string" && metadata.romanizationScheme.length > 0;
  const bannerDismissed = metadata.romanizationBannerDismissed === true;

  const counts = new Map<Script, number>();
  for (const line of lines) {
    if (!line.text) continue;
    const script = detectScript(line.text);
    if (script === "latin") continue;
    counts.set(script, (counts.get(script) ?? 0) + 1);
  }

  let dominantScript: Script = "latin";
  let detectedLineCount = 0;
  for (const [script, count] of counts) {
    if (count > detectedLineCount) {
      dominantScript = script;
      detectedLineCount = count;
    }
  }

  const shouldShowBanner = !schemeSet && !bannerDismissed && detectedLineCount > 0;

  return { schemeSet, bannerDismissed, dominantScript, detectedLineCount, shouldShowBanner };
}

// -- Hook ---------------------------------------------------------------------

function useRomanizationVisibility(): RomanizationVisibility {
  const lines = useProjectStore((s) => s.lines);
  const metadata = useProjectStore((s) => s.metadata);
  return useMemo(() => computeRomanizationVisibility(lines, metadata), [lines, metadata]);
}

// -- Exports ------------------------------------------------------------------

export { computeRomanizationVisibility, useRomanizationVisibility };
export type { RomanizationVisibility };
