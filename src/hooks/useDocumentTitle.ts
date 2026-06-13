import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";

const BRAND = "Composer";
const SEPARATOR = "・";

function useDocumentTitle(): void {
  const songTitle = useProjectStore((s) => s.metadata.title);
  const viewingLibrary = useUIStore((s) => s.viewingLibrary);
  const baseTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (baseTitleRef.current === null) {
      baseTitleRef.current = document.title;
    }
    if (viewingLibrary) {
      document.title = baseTitleRef.current;
      return;
    }
    const trimmed = songTitle.trim();
    document.title = trimmed ? `${BRAND} ${SEPARATOR} ${trimmed}` : baseTitleRef.current;
  }, [songTitle, viewingLibrary]);

  useEffect(() => {
    return () => {
      if (baseTitleRef.current !== null) {
        document.title = baseTitleRef.current;
      }
    };
  }, []);
}

export { useDocumentTitle };
