// -- Types --------------------------------------------------------------------

interface ProjectMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  language?: string;
  romanizationScheme?: string;
}

// -- Exports ------------------------------------------------------------------

export type { ProjectMetadata };
