import { useCallback } from "react";
import { useAudioFileDropHandlers, isAudioFile } from "@/hooks/useAudioFileDropHandlers";

// -- Types --------------------------------------------------------------------

interface FileDropZoneProps {
  accept: string;
  onFileDrop: (file: File) => void;
  children?: React.ReactNode;
}

// -- Component ----------------------------------------------------------------

const FileDropZone: React.FC<FileDropZoneProps> = ({ accept, onFileDrop, children }) => {
  const inputId = "file-drop-input";
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useAudioFileDropHandlers(onFileDrop);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isAudioFile(file)) onFileDrop(file);
    },
    [onFileDrop],
  );

  return (
    <label
      htmlFor={inputId}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`size-full flex cursor-pointer flex-col items-center justify-center p-8 transition-colors ${
        isDragging
          ? "border-composer-accent bg-composer-accent/10"
          : "border-composer-border hover:border-composer-border-hover"
      }`}
    >
      <input
        id={inputId}
        type="file"
        aria-label="Upload audio file"
        accept={accept}
        onChange={handleInputChange}
        className="sr-only"
      />
      {children}
    </label>
  );
};

export { FileDropZone };
