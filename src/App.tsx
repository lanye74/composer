import { AudioEngine } from "@/audio/audio-engine";
import { AudioPlayer } from "@/audio/audio-player";
import { useAutoSeparate } from "@/hooks/useAutoSeparate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useImportFromHash } from "@/hooks/useImportFromHash";
import { useImportFromQuery } from "@/hooks/useImportFromQuery";
import { useImportFromYouTube } from "@/hooks/useImportFromYouTube";
import { usePanicRecovery } from "@/hooks/usePanicRecovery";
import { usePersistence } from "@/hooks/usePersistence";
import { useResolveYouTubeTunnel } from "@/hooks/useResolveYouTubeTunnel";
import { audioBlobs } from "@/lib/audio-blob-store-singleton";
import { openLibraryProject } from "@/lib/library-resume";
import { LibraryPage } from "@/pages/library/library-page";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";
import { GuideCard } from "@/tour/guide-card";
import { useTour } from "@/tour/use-tour";
import "@/tour/tour-theme.css";
import { AppHeader } from "@/ui/app-header";
import { CommandPalette, type PaletteCommandId } from "@/ui/command-palette";
import { ConfirmModalHost } from "@/ui/confirm-modal";
import { DivergenceModalHost } from "@/ui/divergence-modal";
import { LyricsImportModalHost } from "@/views/lyrics-import-modal/lyrics-import-modal-host";
import { HelpModal } from "@/ui/help-modal";
import { SettingsModal } from "@/ui/settings-modal";
import { TabBar } from "@/ui/tab-bar";
import type { SimpleTab } from "@/stores/project";
import { EditPanel } from "@/views/edit";
import { ExportPanel } from "@/views/export";
import { ImportPanel } from "@/views/import";
import { PreviewPanel } from "@/views/preview";
import { SyncPanel } from "@/views/sync/sync-panel";
import { TimelinePanel } from "@/views/timeline/timeline-panel";
import { LazyMotion, domAnimation } from "motion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Activity, useCallback, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";

const TABS_WITH_PLAYER = ["import", "edit", "sync", "timeline", "preview"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

const AppContent: React.FC = () => {
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const source = useAudioStore((s) => s.source);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const viewingLibrary = useUIStore((s) => s.viewingLibrary);
  const setViewingLibrary = useUIStore((s) => s.setViewingLibrary);
  const { startTour, resumeOrStartTour, shouldShowTour, guideCard, skipGuideCard } = useTour();
  const startTourRef = useRef(startTour);
  startTourRef.current = startTour;

  const showLibrary = viewingLibrary || activeProjectId === undefined;
  const showPlayer = !showLibrary && source && TABS_WITH_PLAYER.includes(activeTab);

  const handleOpenProject = useCallback(async (id: string) => {
    await openLibraryProject(id, { audioBlobs });
    useUIStore.getState().setViewingLibrary(false);
  }, []);

  // Auto-start quick tour on first visit
  useEffect(() => {
    if (!shouldShowTour) return;
    const timer = setTimeout(() => startTourRef.current(), 500);
    return () => clearTimeout(timer);
  }, [shouldShowTour]);

  usePersistence();
  useImportFromHash();
  useResolveYouTubeTunnel();
  useImportFromQuery();
  useImportFromYouTube();
  usePanicRecovery();
  useAutoSeparate();
  useDocumentTitle();

  const setHelpOpenCb = useCallback((open: boolean) => setHelpOpen(open), []);
  const setSettingsOpenCb = useCallback(
    (open: boolean) => (open ? openSettings() : closeSettings()),
    [openSettings, closeSettings],
  );
  const openCommandPalette = useCallback(() => setPaletteOpen(true), []);

  const handlePaletteCommand = useCallback(
    (commandId: PaletteCommandId) => {
      const goToTab = (tab: SimpleTab) => {
        setActiveTab(tab);
        if (useUIStore.getState().viewingLibrary) useUIStore.getState().setViewingLibrary(false);
      };
      switch (commandId) {
        case "new-project":
          setViewingLibrary(true);
          break;
        case "open-settings":
          openSettings();
          break;
        case "open-help":
          setHelpOpen(true);
          break;
        case "export-ttml":
          goToTab("export");
          break;
        case "go-to-import":
          goToTab("import");
          break;
        case "go-to-edit":
          goToTab("edit");
          break;
        case "go-to-sync":
          goToTab("sync");
          break;
        case "go-to-timeline":
          goToTab("timeline");
          break;
        case "go-to-preview":
          goToTab("preview");
          break;
        case "go-to-export":
          goToTab("export");
          break;
        case "go-to-library":
          setViewingLibrary(true);
          break;
      }
    },
    [setActiveTab, setViewingLibrary, openSettings],
  );

  useGlobalShortcuts({
    setActiveTab,
    setHelpOpen: setHelpOpenCb,
    setSettingsOpen: setSettingsOpenCb,
    openCommandPalette,
  });

  return (
    <div className="flex flex-col h-screen bg-composer-bg text-composer-text">
      <AppHeader
        onSettingsOpen={() => openSettings()}
        onHelpOpen={() => setHelpOpen(true)}
        onTourStart={resumeOrStartTour}
        onLibraryOpen={() => setViewingLibrary(true)}
      />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenProject={handleOpenProject}
        onCommandRun={handlePaletteCommand}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={closeSettings}
        onResetTour={() => {
          localStorage.removeItem("composer-tour-seen");
          localStorage.removeItem("composer-tour-resume");
        }}
      />
      <AppViewSwitch
        showLibrary={showLibrary}
        activeTab={activeTab}
        onOpenProject={handleOpenProject}
        onOpenSearch={() => setPaletteOpen(true)}
      />
      {source && <AudioEngine />}
      {showPlayer && <AudioPlayer />}
      <GuideCard state={guideCard} onSkip={skipGuideCard} />
    </div>
  );
};

interface AppViewSwitchProps {
  showLibrary: boolean;
  activeTab: string;
  onOpenProject: (id: string) => void | Promise<void>;
  onOpenSearch?: () => void;
}

const AppViewSwitch: React.FC<AppViewSwitchProps> = ({ showLibrary, activeTab, onOpenProject, onOpenSearch }) => (
  <>
    <Activity mode={showLibrary ? "visible" : "hidden"}>
      <LibraryPage onOpenProject={onOpenProject} onOpenSearch={onOpenSearch} />
    </Activity>
    <Activity mode={showLibrary ? "hidden" : "visible"}>
      <TabBar />
      <main className="relative flex-1 overflow-hidden">
        <Activity mode={activeTab === "import" ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex flex-col">
            <ImportPanel />
          </div>
        </Activity>
        <Activity mode={activeTab === "edit" ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex flex-col">
            <EditPanel />
          </div>
        </Activity>
        <Activity mode={activeTab === "sync" ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex flex-col">
            <SyncPanel />
          </div>
        </Activity>
        <Activity mode={activeTab === "timeline" ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex flex-col">
            <TimelinePanel />
          </div>
        </Activity>
        <Activity mode={activeTab === "preview" ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex flex-col">
            <PreviewPanel />
          </div>
        </Activity>
        <Activity mode={activeTab === "export" ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex flex-col">
            <ExportPanel />
          </div>
        </Activity>
      </main>
    </Activity>
  </>
);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        <AppContent />
        <ConfirmModalHost />
        <DivergenceModalHost />
        <LyricsImportModalHost />
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--color-composer-bg-elevated)",
              border: "1px solid var(--color-composer-border)",
              color: "var(--color-composer-text)",
            },
          }}
        />
      </LazyMotion>
    </QueryClientProvider>
  );
};

export { App, AppViewSwitch };
