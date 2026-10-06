"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Asset, Library, MediaFile } from "@/lib/types";
import { aspectOf, downloadUrl, formatBytes, mediaUrl, primaryDownload, thumbUrl } from "@/lib/urls";
import CompareSlider from "./CompareSlider";
import { ChevronLeft, ChevronRight, CloseIcon, DownloadIcon, PlayIcon } from "./icons";

const COMPARE = "compare";

export default function AssetModal({
  asset,
  source,
  onClose,
  onPrev,
  onNext,
}: {
  asset: Asset;
  source: Library["source"];
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const hasPair = !!(asset.before && asset.after);
  // Which file is on stage; falls back to the default whenever the asset changes.
  const [picked, setPicked] = useState<{ assetId: string; view: string } | null>(null);
  const view = picked?.assetId === asset.id ? picked.view : hasPair ? COMPARE : asset.cover.id;
  const setView = (v: string) => setPicked({ assetId: asset.id, view: v });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, onPrev, onNext]);

  const current: MediaFile = asset.files.find((f) => f.id === view) ?? asset.cover;
  const ratio = aspectOf(view === COMPARE ? asset.after : current, asset.kind === "video" ? 16 / 9 : 4 / 3);
  const main = primaryDownload(asset);

  return (
    <motion.div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={asset.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
        <CloseIcon />
      </button>
      {onPrev && (
        <button type="button" className="modal-nav modal-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous">
          <ChevronLeft />
        </button>
      )}
      {onNext && (
        <button type="button" className="modal-nav modal-next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next">
          <ChevronRight />
        </button>
      )}

      <motion.div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="modal-header">
          <div>
            <h2>{asset.title}</h2>
            <p className="modal-sub">{[asset.models.join(", "), ...asset.path].join(" · ")}</p>
          </div>
          <a className="button button-primary" href={main.href} download>
            <DownloadIcon /> {main.label}
          </a>
        </header>

        <div className="modal-stage" key={`${asset.id}-${view}`}>
          {view === COMPARE && asset.before && asset.after ? (
            <CompareSlider before={asset.before} after={asset.after} ratio={ratio} poster={asset.poster} />
          ) : current.kind === "video" ? (
            <video
              className="stage-media"
              style={{ "--ratio": ratio } as React.CSSProperties}
              src={mediaUrl(current)}
              poster={asset.poster ? thumbUrl(asset.poster, 2000) : undefined}
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              className="stage-media"
              style={{ "--ratio": ratio } as React.CSSProperties}
              src={thumbUrl(current, 2000)}
              alt={current.name}
            />
          )}
        </div>

        {(asset.files.length > 1 || hasPair) && (
          <div className="modal-strip" role="tablist" aria-label="Files in this set">
            {hasPair && (
              <button type="button" role="tab" aria-selected={view === COMPARE} className="strip-item strip-compare" onClick={() => setView(COMPARE)}>
                Compare
              </button>
            )}
            {asset.files.map((f) => (
              <button
                type="button"
                role="tab"
                key={f.id}
                aria-selected={view === f.id}
                className="strip-item"
                onClick={() => setView(f.id)}
                title={f.name}
              >
                {f.kind === "video" && source === "local" ? (
                  <video src={`${mediaUrl(f)}#t=0.1`} preload="metadata" muted />
                ) : (
                  <img src={thumbUrl(f, 400)} alt="" loading="lazy" />
                )}
                {f.kind === "video" && <span className="strip-play"><PlayIcon /></span>}
                {f === asset.before && <span className="strip-tag">Before</span>}
                {f === asset.after && <span className="strip-tag">After</span>}
              </button>
            ))}
          </div>
        )}

        <ul className="file-list">
          {asset.files.map((f) => (
            <li key={f.id}>
              <span className="file-name" title={f.name}>{f.name}</span>
              <span className="file-meta">
                {f.width && f.height ? `${f.width} × ${f.height}` : ""} {formatBytes(f.size)}
              </span>
              <a href={downloadUrl(f, f.name)} download className="file-download" aria-label={`Download ${f.name}`}>
                <DownloadIcon />
              </a>
            </li>
          ))}
          {asset.archive && (
            <li>
              <span className="file-name" title={asset.archive.name}>{asset.archive.name}</span>
              <span className="file-meta">{formatBytes(asset.archive.size)}</span>
              <a href={downloadUrl(asset.archive, asset.archive.name)} download className="file-download" aria-label={`Download ${asset.archive.name}`}>
                <DownloadIcon />
              </a>
            </li>
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}
