"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
};

export function ImageDropzone({ files, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url);
    };
  }, [previews]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
      const merged = [...files];
      for (const file of next) {
        if (!merged.some((existing) => existing.name === file.name && existing.size === file.size)) {
          merged.push(file);
        }
      }
      onChange(merged);
    },
    [files, onChange],
  );

  return (
    <div className="space-y-3">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-signal-teal bg-signal-teal/10"
            : "border-white/15 bg-white/5 hover:border-signal-teal/60"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <p className="font-medium text-asphalt-50">Suelta las fotos del recorrido</p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          o haz clic para elegir varios archivos JPEG/PNG
        </p>
      </label>

      {previews.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {previews.map((preview, index) => (
            <li key={`${preview.file.name}-${preview.file.size}-${index}`} className="relative overflow-hidden rounded-xl bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.file.name} className="h-28 w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 bg-asphalt-950/80 px-2 py-0.5 text-xs"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                Quitar
              </button>
              <p className="truncate px-2 py-1 text-[11px] text-[color:var(--muted)]">
                {preview.file.name}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
