"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Asset, Library } from "@/lib/types";
import AssetModal from "./AssetModal";
import Header from "./Header";
import MasonryGrid from "./MasonryGrid";
import ModelSelect from "./ModelSelect";
import Switch from "./Switch";
import { ImageIcon, VideoIcon } from "./icons";

type Sort = "newest" | "oldest" | "name";
const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name (A–Z)" },
];

function matches(a: Asset, terms: string[]) {
  if (!terms.length) return true;
  const hay = [a.title, ...a.models, ...a.tags, ...a.path].join(" ").toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export default function Gallery({ library }: { library: Library }) {
  const [query, setQuery] = useState("");
  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const [model, setModel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  /** Slug of the asset open in the modal (kept in ?asset= so it survives reloads). */
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const q = useDeferredValue(query);

  // Restore filters from the URL so filtered views can be shared. This runs once after
  // hydration (the page itself is statically cached, so the server can't read the query).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQuery(p.get("q")!);
    if (p.get("model") && library.models.includes(p.get("model")!)) setModel(p.get("model"));
    if (p.get("type") === "image") setShowVideos(false);
    if (p.get("type") === "video") setShowImages(false);
    if (SORTS.some((s) => s.value === p.get("sort"))) setSort(p.get("sort") as Sort);
    if (p.get("asset")) setOpenSlug(p.get("asset"));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [library.models]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (model) p.set("model", model);
    if (showImages !== showVideos) p.set("type", showImages ? "image" : "video");
    if (sort !== "newest") p.set("sort", sort);
    if (openSlug) p.set("asset", openSlug);
    const s = p.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [q, model, showImages, showVideos, sort, openSlug]);

  const terms = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  // Matches for everything except the media-type toggles (used for toggle counts).
  const base = useMemo(
    () => library.assets.filter((a) => (!model || a.models.includes(model)) && matches(a, terms)),
    [library.assets, model, terms],
  );

  const filtered = useMemo(() => {
    const list = base.filter((a) => (a.kind === "image" ? showImages : showVideos));
    if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
    if (sort === "oldest") list.sort((a, b) => a.createdTime.localeCompare(b.createdTime));
    return list;
  }, [base, showImages, showVideos, sort]);

  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const a of library.assets) {
      if ((a.kind === "image" ? showImages : showVideos) && matches(a, terms)) {
        for (const m of a.models) counts[m] = (counts[m] ?? 0) + 1;
        total++;
      }
    }
    return { counts, total };
  }, [library.assets, showImages, showVideos, terms]);

  const imageCount = base.filter((a) => a.kind === "image").length;
  const videoCount = base.length - imageCount;
  const filterKey = [q, model, showImages, showVideos, sort].join("|");

  const openIndex = openSlug ? filtered.findIndex((a) => a.slug === openSlug) : -1;
  const open = openIndex >= 0 ? filtered[openIndex] : library.assets.find((a) => a.slug === openSlug);
  const at = useCallback(
    (dir: 1 | -1) => filtered[(openIndex + dir + filtered.length) % filtered.length],
    [filtered, openIndex],
  );
  const step = useCallback(
    (dir: 1 | -1) => {
      if (openIndex >= 0 && filtered.length) setOpenSlug(at(dir).slug);
    },
    [at, filtered.length, openIndex],
  );
  const neighbours = useMemo(() => (openIndex >= 0 ? [at(1), at(-1)] : []), [at, openIndex]);

  return (
    <>
      <Header query={query} onQuery={setQuery} />

      <section className="hero">
        <h1>Topaz Asset Library</h1>
        <p>Before &amp; after images and videos made with Topaz Labs models.</p>
      </section>

      <div className="toolbar">
        <div className="toolbar-group">
          <Switch checked={showImages} onChange={setShowImages} icon={<ImageIcon />} label="Images" count={imageCount} />
          <Switch checked={showVideos} onChange={setShowVideos} icon={<VideoIcon />} label="Video" count={videoCount} />
        </div>
        <div className="toolbar-group">
          <ModelSelect
            models={library.models}
            counts={modelCounts.counts}
            total={modelCounts.total}
            value={model}
            onChange={setModel}
          />
          <label className="select">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="results-meta">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={filtered.length}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            {filtered.length.toLocaleString()} {filtered.length === 1 ? "asset" : "assets"}
          </motion.span>
        </AnimatePresence>
        {model && (
          <button type="button" className="chip" onClick={() => setModel(null)}>
            {model} <span aria-hidden>×</span>
          </button>
        )}
      </div>

      {library.error ? (
        <div className="empty">
          <h2>The library couldn’t be loaded</h2>
          <p>{library.error}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filterKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {filtered.length ? (
              <MasonryGrid assets={filtered} source={library.source} onOpen={setOpenSlug} />
            ) : (
              <div className="empty">
                <h2>No assets found</h2>
                <p>
                  {!showImages && !showVideos
                    ? "Turn on Images or Video to see assets."
                    : "Try a different search or model."}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {open && (
          <AssetModal
            key="modal"
            asset={open}
            source={library.source}
            neighbours={neighbours}
            onClose={() => setOpenSlug(null)}
            onPrev={openIndex >= 0 ? () => step(-1) : undefined}
            onNext={openIndex >= 0 ? () => step(1) : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}
