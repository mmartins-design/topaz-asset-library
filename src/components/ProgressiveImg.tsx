"use client";

import { useState } from "react";
import type { MediaFile } from "@/lib/types";
import { thumbUrl } from "@/lib/urls";

/**
 * Shows a small preview (800px, fast) right away and swaps in the sharp
 * 2000px version once it has downloaded. `onReady` fires when the preview is up.
 */
export default function ProgressiveImg({
  file,
  alt,
  className,
  onReady,
}: {
  file: MediaFile;
  alt: string;
  className?: string;
  onReady?: () => void;
}) {
  const [sharp, setSharp] = useState(false);
  // Images can finish before React attaches onLoad (cache hits, hydration), so check `complete` too.
  const whenLoaded = (cb: () => void) => (el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth) cb();
  };
  const ready = () => onReady?.();

  return (
    <span className={`progressive ${className ?? ""}`} data-sharp={sharp}>
      <img
        ref={whenLoaded(ready)}
        src={thumbUrl(file, 800)}
        alt={alt}
        draggable={false}
        onLoad={ready}
        onError={ready}
      />
      <img
        ref={whenLoaded(() => setSharp(true))}
        className="progressive-sharp"
        src={thumbUrl(file, 2000)}
        alt=""
        aria-hidden
        draggable={false}
        onLoad={() => setSharp(true)}
      />
    </span>
  );
}
