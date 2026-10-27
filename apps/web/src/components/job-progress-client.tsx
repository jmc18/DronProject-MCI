"use client";

import { useEffect, useState } from "react";

type Props = {
  jobId: string;
  initialStatus: string;
  initialProgress: number;
};

export function JobProgressClient({ jobId, initialStatus, initialProgress }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);

  useEffect(() => {
    let cancelled = false;
    const terminal = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
    if (terminal.has(initialStatus)) return;

    const tick = async () => {
      try {
        const res = await fetch(`/api/videos/${jobId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.job) return;
        setStatus(data.job.status);
        setProgress(data.job.progress ?? 0);
        if (terminal.has(data.job.status)) {
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    };

    const id = window.setInterval(tick, 3000);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [jobId, initialStatus]);

  return (
    <div className="border border-white/10 p-4">
      <div className="mb-2 flex justify-between text-sm">
        <span>{status}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 w-full bg-white/10">
        <div
          className="h-2 bg-signal-teal transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        El análisis 8K con tiling puede tardar; no cierres el worker.
      </p>
    </div>
  );
}
