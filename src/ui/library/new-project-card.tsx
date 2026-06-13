import { IconPlus } from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import { isAudioFile, useAudioFileDropHandlers } from "@/hooks/useAudioFileDropHandlers";
import { cn } from "@/utils/cn";

// -- Interfaces ---------------------------------------------------------------

interface NewProjectCardProps {
  onFile: (file: File) => void;
}

// -- Component ----------------------------------------------------------------

const NewProjectCard: React.FC<NewProjectCardProps> = ({ onFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useAudioFileDropHandlers(onFile);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isAudioFile(file)) onFile(file);
      e.target.value = "";
    },
    [onFile],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "group flex flex-col items-center justify-center text-center select-none",
        "aspect-square rounded-xl cursor-pointer",
        "border border-dashed border-composer-border bg-transparent text-composer-text-muted",
        "transition-[border-color,background-color,color] duration-150",
        "hover:border-composer-accent hover:text-composer-text",
        "hover:bg-composer-accent/5",
        isDragging && "border-composer-accent bg-composer-accent/10 text-composer-text",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        aria-label="Upload audio file"
        accept="audio/*"
        onChange={handleInputChange}
        className="sr-only"
      />
      <span
        className={cn(
          "inline-flex items-center justify-center size-9 rounded-full mb-2",
          "bg-composer-accent/15 text-composer-accent-text",
        )}
      >
        <IconPlus className="size-5" />
      </span>
      <span className="text-xs font-semibold">New project</span>
      <span className="mt-0.5 text-[11px] text-composer-text-muted">Drop or click</span>
    </button>
  );
};

// -- Exports ------------------------------------------------------------------

export { NewProjectCard };
