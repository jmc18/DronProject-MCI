"use client";

import { create } from "zustand";
import { inspectionApi } from "@/services/inspection-api";

type NewInspectionStore = {
  title: string;
  location: string;
  files: File[];
  busy: boolean;
  error: string | null;
  progress: string | null;
  setTitle: (title: string) => void;
  setLocation: (location: string) => void;
  setFiles: (files: File[]) => void;
  reset: () => void;
  submit: () => Promise<string>;
};

const empty = {
  title: "",
  location: "",
  files: [] as File[],
  busy: false,
  error: null as string | null,
  progress: null as string | null,
};

export const useNewInspectionStore = create<NewInspectionStore>((set, get) => ({
  ...empty,

  setTitle: (title) => set({ title, error: null }),
  setLocation: (location) => set({ location }),
  setFiles: (files) => set({ files, error: null }),
  reset: () => set(empty),

  submit: async () => {
    const { title, location, files } = get();
    if (!title.trim()) {
      set({ error: "Escribe un título para el recorrido." });
      throw new Error("validation");
    }
    if (files.length === 0) {
      set({ error: "Agrega al menos una fotografía." });
      throw new Error("validation");
    }

    set({ busy: true, error: null, progress: "Creando recorrido…" });
    try {
      const created = await inspectionApi.create({
        title: title.trim(),
        location: location.trim() || undefined,
      });
      set({
        progress: `Analizando ${files.length} foto${files.length === 1 ? "" : "s"}…`,
      });
      await inspectionApi.uploadImages(created.id, files);
      set(empty);
      return created.id;
    } catch (err) {
      if (err instanceof Error && err.message === "validation") throw err;
      set({
        busy: false,
        progress: null,
        error: err instanceof Error ? err.message : "Error inesperado",
      });
      throw err;
    }
  },
}));
