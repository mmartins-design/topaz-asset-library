"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MediaFile } from "@/lib/types";
import { mediaUrl, thumbUrl } from "@/lib/urls";
import Loader from "./Loader";
import ProgressiveImg from "./ProgressiveImg";
import { FitIcon, MinusIcon, PlusIcon } from "./icons";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const STEP = 1.5;
/** Past this zoom the full-resolution originals are loaded. */
const FULL_RES_AT = 1.5;

/** Zoom level and pan offset (px, relative to the box's top-left), shared by both sides. */
type View = { scale: number; x: number; y: number };
const FIT: View = { scale: 1, x: 0, y: 0 };

/**
 * Drag-to-reveal before/after comparison for image and video pairs, with
 * zoom (buttons, pinch, ⌘/Ctrl + scroll, double-click) and drag-to-pan.
 * Both sides share one transform, so they always stay pixel-aligned.
 */
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
  const [view, setView] = useState<View>(FIT);
  // Latest view for event handlers registered outside React (wheel) and gesture starts.
  const viewRef = useRef(view);
  useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);
  const [loadFull, setLoadFull] = useState(false);

  // The loader stays up until both sides can be shown.
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const markReady = (id: string) => setReadyIds((r) => (r.includes(id) ? r : [...r, id]));
  const ready = readyIds.includes(before.id) && readyIds.includes(after.id);

  const box = useRef<HTMLDivElement>(null);
  const beforeVideo = useRef<HTMLVideoElement>(null);
  const afterVideo = useRef<HTMLVideoElement>(null);
  const isVideo = after.kind === "video";
  const zoomed = view.scale > 1.001;

  /** Keeps the zoomed content covering the whole box (no empty edges). */
  const clamp = useCallback((v: View): View => {
    const r = box.current?.getBoundingClientRect();
    const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale));
    if (!r) return { ...v, scale };
    return {
      scale,
      x: Math.min(0, Math.max(r.width - r.width * scale, v.x)),
      y: Math.min(0, Math.max(r.height - r.height * scale, v.y)),
    };
  }, []);

  /** Zooms to `scale`, keeping the point (px, py) inside the box fixed on screen. */
  const zoomAt = useCallback(
    (scale: number, px?: number, py?: number) => {
      const r = box.current!.getBoundingClientRect();
      const cx = px ?? r.width / 2;
      const cy = py ?? r.height / 2;
      setView((v) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
        const k = next / v.scale;
        return clamp({ scale: next, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
      if (scale >= FULL_RES_AT) setLoadFull(true);
    },
    [clamp],
  );

  const local = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top, w: r.width };
  };
  const moveTo = (clientX: number) => {
    const { x, w } = local(clientX, 0);
    setPos(Math.max(0, Math.min(100, (x / w) * 100)));
  };

  // Scroll wheel zooms toward the cursor (up = in, down = out). At 100%, scrolling
  // down is left to the page so the image never traps page scrolling.
  // Trackpad pinch arrives as wheel + ctrlKey and zooms the same way; sideways
  // trackpad swipes pan while zoomed.
  // Registered by hand because React's wheel listener can't preventDefault.
  useEffect(() => {
    const el = box.current!;
    const onWheel = (e: WheelEvent) => {
      const v = viewRef.current;
      // Normalise line/page deltas (Firefox sends ~3 lines per notch) so one notch ≈ 100px everywhere.
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? el.clientHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      const pinch = e.ctrlKey || e.metaKey;

      if (!pinch && Math.abs(dx) > Math.abs(dy)) {
        if (v.scale > 1.001) {
          e.preventDefault();
          setView((cur) => clamp({ ...cur, x: cur.x - dx }));
        }
        return;
      }
      if (!pinch && dy > 0 && v.scale <= MIN_ZOOM + 0.001) return; // let the page scroll

      e.preventDefault();
      const { x, y } = local(e.clientX, e.clientY);
      // Pinch deltas are small and frequent; wheel notches are ~100px.
      const speed = pinch ? 0.01 : 0.0025;
      zoomAt(v.scale * Math.exp(-dy * speed), x, y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp, zoomAt]);

  // Pointer gestures: one finger/mouse slides the divider (or pans when zoomed),
  // two fingers pinch-zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { mode: "slide" }
    | { mode: "pan"; startX: number; startY: number; view: View }
    | { mode: "pinch"; dist: number; view: View; cx: number; cy: number }
    | null
  >(null);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      mode: "pinch",
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      view: viewRef.current,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".compare-controls")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {} // capture can fail for pointers the browser doesn't consider active
    const p = local(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) return startPinch();
    const onKnob = !!(e.target as HTMLElement).closest(".compare-knob");
    if (onKnob || !zoomed) {
      gesture.current = { mode: "slide" };
      moveTo(e.clientX);
    } else {
      gesture.current = { mode: "pan", startX: p.x, startY: p.y, view: viewRef.current };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "slide") moveTo(e.clientX);
    else if (g.mode === "pan") {
      setView(clamp({ ...g.view, x: g.view.x + p.x - g.startX, y: g.view.y + p.y - g.startY }));
    } else if (g.mode === "pinch" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (g.view.scale * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist));
      const k = scale / g.view.scale;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      // Zoom around the starting midpoint and follow the fingers as they move.
      setView(clamp({ scale, x: cx - (g.cx - g.view.x) * k, y: cy - (g.cy - g.view.y) * k }));
      if (scale >= FULL_RES_AT) setLoadFull(true);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      // Lifting one finger of a pinch continues as a pan with the remaining one.
      const [p] = [...pointers.current.values()];
      gesture.current = { mode: "pan", startX: p.x, startY: p.y, view: viewRef.current };
    } else if (pointers.current.size === 0) gesture.current = null;
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".compare-controls, .compare-knob")) return;
    if (zoomed) setView(FIT);
    else {
      const { x, y } = local(e.clientX, e.clientY);
      zoomAt(2.5, x, y);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "+" || e.key === "=") zoomAt(viewRef.current.scale * STEP);
    else if (e.key === "-" || e.key === "_") zoomAt(viewRef.current.scale / STEP);
    else if (e.key === "0") setView(FIT);
    else return;
    e.preventDefault();
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

  const transform = { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` };

  const layer = (f: MediaFile, ref: React.RefObject<HTMLVideoElement | null>, isAfter: boolean) => (
    <div className="compare-zoom" style={transform}>
      {isVideo ? (
        <video
          ref={ref}
          src={mediaUrl(f)}
          poster={poster ? thumbUrl(poster, 2000) : undefined}
          autoPlay={isAfter}
          preload="auto"
          onLoadedData={() => markReady(f.id)}
          onError={() => markReady(f.id)}
          muted
          loop
          playsInline
          draggable={false}
        />
      ) : (
        <ProgressiveImg file={f} alt={isAfter ? "After" : "Before"} full={loadFull} onReady={() => markReady(f.id)} />
      )}
    </div>
  );

  return (
    <div
      ref={box}
      className="compare"
      data-ready={ready}
      data-zoomed={zoomed}
      tabIndex={0}
      aria-label="Before and after comparison. Scroll or use + and − to zoom, 0 to reset."
      style={{ "--ratio": ratio } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
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

      <div className="compare-controls" role="toolbar" aria-label="Zoom">
        <button type="button" onClick={() => zoomAt(view.scale / STEP)} disabled={!zoomed} aria-label="Zoom out">
          <MinusIcon />
        </button>
        <button type="button" className="compare-zoom-level" onClick={() => setView(FIT)} aria-label="Reset zoom" title="Reset zoom">
          {Math.round(view.scale * 100)}%
        </button>
        <button type="button" onClick={() => zoomAt(view.scale * STEP)} disabled={view.scale >= MAX_ZOOM} aria-label="Zoom in">
          <PlusIcon />
        </button>
        <button type="button" onClick={() => setView(FIT)} disabled={!zoomed} aria-label="Fit to frame" title="Fit">
          <FitIcon />
        </button>
      </div>

      {!ready && <Loader label="Loading before and after" />}
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
