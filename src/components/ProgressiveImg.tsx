"use client";

import { useState } from "react";
import type { MediaFile } from "@/lib/types";
import { mediaUrl, thumbUrl } from "@/lib/urls";

/**
 * Shows a small preview (800px, fast) right away and swaps in the sharp
 * 2000px version once it has downloaded. `onReady` fires when the preview is up.
 * With `full`, the original file is loaded on top too (used when zoomed in);
 * once requested it stays, so zooming out and back in doesn't reload it.
 */
export default function ProgressiveImg({
  file,
  alt,
  className,
  full = false,
  onReady,
}: {
  file: MediaFile;
  alt: string;
  className?: string;
  full?: boolean;
  onReady?: () => void;
}) {
  const [sharp, setSharp] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [fullRequested, setFullRequested] = useState(false);
  if (full && !fullRequested) setFullRequested(true);

  // Images can finish before React attaches onLoad (cache hits, hydration), so check `complete` too.
  const whenLoaded = (cb: () => void) => (el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth) cb();
  };
  const ready = () => onReady?.();

  return (
    <span className={`progressive ${className ?? ""}`} data-sharp={sharp} data-full={fullLoaded}>
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
      {fullRequested && (
        <img
          ref={whenLoaded(() => setFullLoaded(true))}
          className="progressive-full"
          src={mediaUrl(file)}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          onLoad={() => setFullLoaded(true)}
        />
      )}
    </span>
  );
}
