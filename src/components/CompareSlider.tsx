"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaFile } from "@/lib/types";
import { mediaUrl, thumbUrl } from "@/lib/urls";

/** Drag-to-reveal before/after comparison. Works for image pairs and video pairs. */
export default function CompareSlider({
  before,
  after,
  ratio,
  poster,
}: {
  before: MediaFile;
  after: MediaFile;
  ratio: number;
  /** Still image shown while videos load. */
  poster?: MediaFile;
}) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const beforeVideo = useRef<HTMLVideoElement>(null);
  const afterVideo = useRef<HTMLVideoElement>(null);
  const isVideo = after.kind === "video";

  const moveTo = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  // Keep the two videos in lockstep.
  useEffect(() => {
    if (!isVideo) return;
    const a = afterVideo.current!;
    const b = beforeVideo.current!;
    const sync = () => {
      if (Math.abs(a.currentTime - b.currentTime) > 0.15) b.currentTime = a.currentTime;
      if (a.paused !== b.paused) void (a.paused ? b.pause() : b.play().catch(() => {}));
    };
    a.addEventListener("timeupdate", sync);
    a.addEventListener("play", sync);
    a.addEventListener("pause", sync);
    a.addEventListener("seeked", sync);
    return () => {
      a.removeEventListener("timeupdate", sync);
      a.removeEventListener("play", sync);
      a.removeEventListener("pause", sync);
      a.removeEventListener("seeked", sync);
    };
  }, [isVideo]);

  const layer = (f: MediaFile, ref: React.RefObject<HTMLVideoElement | null>, isAfter: boolean) =>
    isVideo ? (
      <video
        ref={ref}
        src={mediaUrl(f.id)}
        poster={poster ? thumbUrl(poster.id, 2000) : undefined}
        autoPlay={isAfter}
        muted
        loop
        playsInline
        draggable={false}
      />
    ) : (
      <img src={thumbUrl(f.id, 2000)} alt={isAfter ? "After" : "Before"} draggable={false} />
    );

  return (
    <div
      ref={box}
      className="compare"
      style={{ "--ratio": ratio } as React.CSSProperties}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && moveTo(e.clientX)}
    >
      {layer(after, afterVideo, true)}
      <div className="compare-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {layer(before, beforeVideo, false)}
      </div>
      <div className="compare-handle" style={{ left: `${pos}%` }}>
        <span className="compare-knob" aria-hidden>‹ ›</span>
      </div>
      <span className="compare-label compare-label-before">Before</span>
      <span className="compare-label compare-label-after">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="compare-range"
        aria-label="Before / after comparison position"
      />
    </div>
  );
}
