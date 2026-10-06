"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Library } from "@/lib/types";
import { aspectOf, displayFile } from "@/lib/urls";
import AssetCard from "./AssetCard";

const PAGE = 30;

function columnsFor(width: number) {
  if (width >= 1400) return 4;
  if (width >= 900) return 3;
  return 2;
}

/**
 * Masonry like Pexels: items are placed left-to-right into the currently
 * shortest column, so reading order stays roughly row-by-row.
 */
export default function MasonryGrid({
  assets,
  source,
  onOpen,
}: {
  assets: Asset[];
  source: Library["source"];
  onOpen: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(([e]) => setCols(columnsFor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Infinite scroll: reveal the next page when the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible((v) => Math.min(v + PAGE, assets.length)),
      { rootMargin: "1200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [assets.length, visible]);

  const columns = useMemo(() => {
    const out: { asset: Asset; index: number }[][] = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);
    assets.slice(0, visible).forEach((asset, index) => {
      const col = heights.indexOf(Math.min(...heights));
      out[col].push({ asset, index });
      heights[col] += 1 / aspectOf(displayFile(asset), asset.kind === "video" ? 16 / 9 : 4 / 3);
    });
    return out;
  }, [assets, cols, visible]);

  return (
    <>
      <div className="masonry" ref={ref} style={{ "--cols": cols } as React.CSSProperties}>
        {columns.map((col, i) => (
          <div className="masonry-col" key={i}>
            {col.map(({ asset, index }) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                source={source}
                // Stagger within each newly revealed page.
                delay={Math.min(index % PAGE, 14) * 0.035}
                priority={index < 8}
                onOpen={onOpen}
              />
            ))}
          </div>
        ))}
      </div>
      {visible < assets.length && <div ref={sentinel} className="sentinel" aria-hidden />}
    </>
  );
}
