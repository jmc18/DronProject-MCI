"use client";

import { create } from "zustand";
import { healthApi, type HealthSnapshot } from "@/services/health-api";
import { inspectionApi } from "@/services/inspection-api";

type HealthStore = {
  health: HealthSnapshot | null;
  recorridoCount: number;
  potholeCount: number;
  status: "idle" | "loading" | "error";
  error: string | null;
  hydrate: (data: {
    health: HealthSnapshot;
    recorridoCount: number;
    potholeCount: number;
  }) => void;
  refresh: () => Promise<void>;
};

export const useHealthStore = create<HealthStore>((set) => ({
  health: null,
  recorridoCount: 0,
  potholeCount: 0,
  status: "idle",
  error: null,

  hydrate: (data) =>
    set({
      health: data.health,
      recorridoCount: data.recorridoCount,
      potholeCount: data.potholeCount,
      status: "idle",
      error: null,
    }),

  refresh: async () => {
    set({ status: "loading", error: null });
    try {
      const [health, items] = await Promise.all([healthApi.get(), inspectionApi.list()]);
      set({
        health,
        recorridoCount: items.length,
        potholeCount: items.reduce((sum, item) => sum + item.potholeCount, 0),
        status: "idle",
      });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "No se pudo leer el estado",
      });
    }
  },
}));
