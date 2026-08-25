"use client";

import { UploadSimple, X } from "@phosphor-icons/react";
import { useId, useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";

export type FileUploadProps = {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

/**
 * A drop zone over a native file input: click or drag to add files, with a
 * live drag-over state and a removable list of what was picked.
 */
export function FileUpload({
  onFiles,
  accept,
  multiple = false,
  label = "Drop a file or click to browse",
  hint,
  className,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const accept_ = accept;

  const add = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = multiple ? [...files, ...Array.from(list)] : [Array.from(list)[0]];
    setFiles(next);
    onFiles(next);
  };

  const removeAt = (i: number) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFiles(next);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "focus-within:border-border-focus flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--radius-panel)] border border-dashed px-4 py-6 text-center",
          dragging
            ? "border-primary bg-[var(--intent-accent-soft)]"
            : "border-border-default bg-surface-canvas hover:bg-surface-hover"
        )}
      >
        <UploadSimple className="size-5 [color:var(--content-tertiary)]" />
        <span className="text-ui-small [color:var(--content-secondary)]">
          {label}
        </span>
        {hint ? (
          <span className="text-ui-caption [color:var(--content-tertiary)]">
            {hint}
          </span>
        ) : null}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept_}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
      </label>
      {files.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="border-border-subtle bg-surface-panel flex items-center gap-2 rounded-[var(--radius-control)] border px-2.5 py-1.5"
            >
              <span className="text-ui-small [color:var(--content-primary)] min-w-0 flex-1 truncate">
                {f.name}
              </span>
              <span className="text-ui-caption [color:var(--content-tertiary)] shrink-0 [font-variant-numeric:tabular-nums]">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <IconButton
                aria-label={`Remove ${f.name}`}
                size="sm"
                onClick={() => removeAt(i)}
              >
                <X />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
