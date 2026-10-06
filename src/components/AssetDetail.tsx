"use client";

import { useState } from "react";
import type { Asset, Library, MediaFile } from "@/lib/types";
import { aspectOf, downloadUrl, formatBytes, mediaUrl, primaryDownload, thumbUrl } from "@/lib/urls";
import CompareSlider from "./CompareSlider";
import Loader from "./Loader";
import ProgressiveImg from "./ProgressiveImg";
import ShareButton from "./ShareButton";
import { DownloadIcon, PlayIcon } from "./icons";

const COMPARE = "compare";

/** Title, actions, before/after viewer and downloads. Used by the modal and the /asset/[slug] page. */
export default function AssetDetail({
  asset,
  source,
  headingLevel = 2,
}: {
  asset: Asset;
  source: Library["source"];
  headingLevel?: 1 | 2;
}) {
  const hasPair = !!(asset.before && asset.after);
  // Which file is on stage; falls back to the default whenever the asset changes.
  const [picked, setPicked] = useState<{ assetId: string; view: string } | null>(null);
  const view = picked?.assetId === asset.id ? picked.view : hasPair ? COMPARE : asset.cover.id;
  const setView = (v: string) => setPicked({ assetId: asset.id, view: v });

  const current: MediaFile = asset.files.find((f) => f.id === view) ?? asset.cover;
  const ratio = aspectOf(view === COMPARE ? asset.after : current, asset.kind === "video" ? 16 / 9 : 4 / 3);
  const main = primaryDownload(asset);
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <>
      <header className="detail-header">
        <div className="detail-titles">
          <Heading className="detail-title">{asset.title}</Heading>
          <p className="detail-sub">{[asset.models.join(", "), ...asset.path].join(" · ")}</p>
        </div>
        <div className="detail-actions">
          <ShareButton asset={asset} />
          <a className="button button-primary" href={main.href} download>
            <DownloadIcon /> {main.label}
          </a>
        </div>
      </header>

      <div className="detail-stage" key={`${asset.id}-${view}`}>
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
          <StageImage file={current} ratio={ratio} />
        )}
      </div>

      {(asset.files.length > 1 || hasPair) && (
        <div className="detail-strip" role="tablist" aria-label="Files in this set">
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
    </>
  );
}

function StageImage({ file, ratio }: { file: MediaFile; ratio: number }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="stage-media stage-frame" style={{ "--ratio": ratio } as React.CSSProperties}>
      <ProgressiveImg file={file} alt={file.name} onReady={() => setReady(true)} />
      {!ready && <Loader />}
    </div>
  );
}
