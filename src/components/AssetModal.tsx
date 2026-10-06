"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import type { Asset, Library } from "@/lib/types";
import { warmAsset } from "@/lib/urls";
import AssetDetail from "./AssetDetail";
import { ChevronLeft, ChevronRight, CloseIcon } from "./icons";

export default function AssetModal({
  asset,
  source,
  neighbours = [],
  onClose,
  onPrev,
  onNext,
}: {
  asset: Asset;
  source: Library["source"];
  /** Previous/next assets, preloaded so arrowing through is instant. */
  neighbours?: Asset[];
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
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

  useEffect(() => {
    neighbours.forEach(warmAsset);
  }, [neighbours]);

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
        <AssetDetail asset={asset} source={source} />
      </motion.div>
    </motion.div>
  );
}
