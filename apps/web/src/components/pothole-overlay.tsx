"use client";

import { useState } from "react";
import { scaledBbox } from "@/domain/bbox";
import type { ReviewPothole } from "@/domain/inspection-view";

type Props = {
  src: string;
  alt: string;
  sampleFactor: number;
  potholes: ReviewPothole[];
  naturalWidth?: number | null;
  naturalHeight?: number | null;
};

export function PotholeOverlay({
  src,
  alt,
  sampleFactor,
  potholes,
  naturalWidth,
  naturalHeight,
}: Props) {
  const [size, setSize] = useState({
    w: naturalWidth && naturalWidth > 0 ? naturalWidth : 1,
    h: naturalHeight && naturalHeight > 0 ? naturalHeight : 1,
  });

  return (
    <div className="relative inline-block max-h-[70vh] max-w-full overflow-hidden rounded-2xl bg-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="block max-h-[70vh] max-w-full"
        onLoad={(event) => {
          setSize({
            w: event.currentTarget.naturalWidth,
            h: event.currentTarget.naturalHeight,
          });
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="none"
      >
        {potholes.map((pothole, index) => {
          const box = scaledBbox(pothole, sampleFactor);
          if (box.w <= 0 || box.h <= 0) return null;
          return (
            <g key={pothole.id}>
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                fill="rgba(232, 163, 23, 0.18)"
                stroke="#e8a317"
                strokeWidth={Math.max(size.w / 400, 2)}
              />
              <text
                x={box.x + 6}
                y={Math.max(box.y, 0) + Math.max(size.h / 40, 18)}
                fill="#f4f6f8"
                fontSize={Math.max(size.w / 70, 14)}
                fontFamily="IBM Plex Sans, sans-serif"
              >
                #{index + 1}
                {pothole.confidence != null ? ` ${Math.round(pothole.confidence * 100)}%` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
