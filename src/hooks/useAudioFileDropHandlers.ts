import { useCallback, useRef, useState } from "react";

// -- Types --------------------------------------------------------------------

interface AudioFileDropHandlers {
  isDragging: boolean;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

// -- Constants ----------------------------------------------------------------

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/flac",
];

const AUDIO_FILE_EXTENSION = /\.(mp3|wav|m4a|ogg|flac)$/i;

function isAudioFile(file: File): boolean {
  return ACCEPTED_AUDIO_TYPES.includes(file.type) || AUDIO_FILE_EXTENSION.test(file.name);
}

// -- Hook ---------------------------------------------------------------------

function useAudioFileDropHandlers(onFile: (file: File) => void): AudioFileDropHandlers {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (dragCountRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isAudioFile(file)) onFile(file);
    },
    [onFile],
  );

  return { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
}

// -- Exports ------------------------------------------------------------------

export { useAudioFileDropHandlers, isAudioFile };
export type { AudioFileDropHandlers };
