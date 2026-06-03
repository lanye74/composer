// -- Types --------------------------------------------------------------------

interface ProjectMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  language?: string;
  romanizationScheme?: string;
  romanizationBannerDismissed?: boolean;
  timelinePrimaryWordText?: "source" | "romaji";
}

// -- Exports ------------------------------------------------------------------

export type { ProjectMetadata };
