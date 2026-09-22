"use client";

import { create } from "zustand";
import type { InspectionListItemDto, InspectionReviewDto } from "@/domain/inspection-view";
import { inspectionApi } from "@/services/inspection-api";

type LoadState = "idle" | "loading" | "error";

type InspectionStore = {
  items: InspectionListItemDto[];
  listStatus: LoadState;
  listError: string | null;
  current: InspectionReviewDto | null;
  currentStatus: LoadState;
  currentError: string | null;
  selectedImageId: string | null;
  hydrateList: (items: InspectionListItemDto[]) => void;
  hydrateCurrent: (inspection: InspectionReviewDto) => void;
  selectImage: (id: string) => void;
  fetchList: () => Promise<void>;
  fetchCurrent: (id: string) => Promise<void>;
};

export const useInspectionStore = create<InspectionStore>((set) => ({
  items: [],
  listStatus: "idle",
  listError: null,
  current: null,
  currentStatus: "idle",
  currentError: null,
  selectedImageId: null,

  hydrateList: (items) => set({ items, listStatus: "idle", listError: null }),

  hydrateCurrent: (inspection) =>
    set({
      current: inspection,
      currentStatus: "idle",
      currentError: null,
      selectedImageId: inspection.images[0]?.id ?? null,
    }),

  selectImage: (id) => set({ selectedImageId: id }),

  fetchList: async () => {
    set({ listStatus: "loading", listError: null });
    try {
      const items = await inspectionApi.list();
      set({ items, listStatus: "idle" });
    } catch (err) {
      set({
        listStatus: "error",
        listError: err instanceof Error ? err.message : "No se pudieron cargar los recorridos",
      });
    }
  },

  fetchCurrent: async (id) => {
    set({ currentStatus: "loading", currentError: null });
    try {
      const inspection = await inspectionApi.getById(id);
      set({
        current: inspection,
        currentStatus: "idle",
        selectedImageId: inspection.images[0]?.id ?? null,
      });
    } catch (err) {
      set({
        currentStatus: "error",
        currentError: err instanceof Error ? err.message : "No se pudo cargar el recorrido",
      });
    }
  },
}));
