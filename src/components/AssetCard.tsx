"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Asset, Library } from "@/lib/types";
import { aspectOf, assetPath, displayFile, mediaUrl, primaryDownload, thumbUrl, warmAsset } from "@/lib/urls";
import { DownloadIcon, PlayIcon } from "./icons";

export default function AssetCard({
  asset,
  source,
  delay,
  priority,
  onOpen,
}: {
  asset: Asset;
  source: Library["source"];
  delay: number;
  priority: boolean;
  onOpen: (slug: string) => void;
}) {
  const shown = displayFile(asset);
  const isVideo = asset.kind === "video";
  const ratio = aspectOf(shown, isVideo ? 16 / 9 : 4 / 3);
  const [loaded, setLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const download = primaryDownload(asset);

  // Locally there's no thumbnail service, so a video without a poster image shows its first frame.
  const videoFrameOnly = shown.kind === "video" && source === "local";

  return (
    <motion.article
      className="card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={(e) => {
        warmAsset(asset);
        if (e.pointerType === "mouse") setHovering(true);
      }}
      onPointerLeave={() => {
        setHovering(false);
        setPlaying(false);
      }}
    >
      <a
        href={assetPath(asset)}
        className="card-media"
        style={{ aspectRatio: ratio }}
        onClick={(e) => {
          // Let cmd/ctrl/shift-click open the asset page in a new tab.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onOpen(asset.slug);
        }}
        aria-label={`Open ${asset.title}`}
        data-loaded={loaded}
      >
        {videoFrameOnly ? (
          <video
            src={`${mediaUrl(shown)}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            // Images can finish loading before hydration, when onLoad has no listener yet.
            ref={(el) => {
              if (el?.complete) setLoaded(true);
            }}
            src={thumbUrl(shown, 800)}
            alt={asset.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )}
        {isVideo && hovering && (
          <video
            className="card-preview"
            data-playing={playing}
            src={mediaUrl(asset.cover)}
            autoPlay
            muted
            loop
            playsInline
            onPlaying={() => setPlaying(true)}
          />
        )}
      </a>

      <div className="card-badges">
        {isVideo && (
          <span className="badge"><PlayIcon /> Video</span>
        )}
        {asset.before && asset.after && <span className="badge">Before / After</span>}
      </div>

      <a
        className="card-download"
        href={download.href}
        download
        aria-label={`${download.label}: ${asset.title}`}
        title={download.label}
      >
        <DownloadIcon />
      </a>

      <div className="card-info">
        <span className="card-title">{asset.title}</span>
        <span className="card-model">{[asset.models.join(", "), ...asset.path].join(" · ")}</span>
      </div>
    </motion.article>
  );
}
