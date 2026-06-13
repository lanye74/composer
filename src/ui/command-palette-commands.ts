import {
  IconDownload,
  IconEye,
  IconFileImport,
  IconHandClick,
  IconLayoutRows,
  IconLibrary,
  IconLifebuoy,
  IconPencil,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

type PaletteCommandId =
  | "new-project"
  | "open-settings"
  | "open-help"
  | "export-ttml"
  | "go-to-import"
  | "go-to-edit"
  | "go-to-sync"
  | "go-to-timeline"
  | "go-to-preview"
  | "go-to-export"
  | "go-to-library";

interface PaletteCommandDescriptor {
  id: PaletteCommandId;
  name: string;
  sub: string;
  Icon: React.ComponentType<{ className?: string }>;
  shortcutId?: string;
}

// -- Data ---------------------------------------------------------------------

const PALETTE_COMMANDS: PaletteCommandDescriptor[] = [
  {
    id: "new-project",
    name: "New project",
    sub: "Create a blank library entry",
    Icon: IconPlus,
  },
  {
    id: "open-settings",
    name: "Open settings",
    sub: "Preferences, shortcuts, storage",
    Icon: IconSettings,
    shortcutId: "global.settings",
  },
  {
    id: "open-help",
    name: "Help",
    sub: "Guides and keyboard reference",
    Icon: IconLifebuoy,
    shortcutId: "global.help",
  },
  {
    id: "export-ttml",
    name: "Export TTML",
    sub: "Download the current project",
    Icon: IconDownload,
  },
  {
    id: "go-to-import",
    name: "Switch to Import tab",
    sub: "Bring in audio and lyrics",
    Icon: IconFileImport,
    shortcutId: "global.goToImport",
  },
  {
    id: "go-to-edit",
    name: "Switch to Edit tab",
    sub: "Edit lyrics and metadata",
    Icon: IconPencil,
    shortcutId: "global.goToEdit",
  },
  {
    id: "go-to-sync",
    name: "Switch to Sync tab",
    sub: "Tap or hold to sync words",
    Icon: IconHandClick,
    shortcutId: "global.goToSync",
  },
  {
    id: "go-to-timeline",
    name: "Switch to Timeline tab",
    sub: "View timing on the waveform",
    Icon: IconLayoutRows,
    shortcutId: "global.goToTimeline",
  },
  {
    id: "go-to-preview",
    name: "Switch to Preview tab",
    sub: "Watch the synced lyrics play",
    Icon: IconEye,
    shortcutId: "global.goToPreview",
  },
  {
    id: "go-to-export",
    name: "Switch to Export tab",
    sub: "Download TTML or copy to clipboard",
    Icon: IconDownload,
    shortcutId: "global.goToExport",
  },
  {
    id: "go-to-library",
    name: "Browse library",
    sub: "Return to your saved projects",
    Icon: IconLibrary,
  },
];

// -- Exports ------------------------------------------------------------------

export { PALETTE_COMMANDS };
export type { PaletteCommandDescriptor, PaletteCommandId };
