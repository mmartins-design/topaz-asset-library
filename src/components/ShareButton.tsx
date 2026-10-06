"use client";

import { useState } from "react";
import type { Asset } from "@/lib/types";
import { assetPath } from "@/lib/urls";
import { CheckIcon, ShareIcon } from "./icons";

/** Opens the native share sheet on phones; copies the asset page link everywhere else. */
export default function ShareButton({ asset }: { asset: Asset }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(assetPath(asset), window.location.origin).toString();
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: `${asset.title} · Topaz Labs`, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" className="button button-secondary" onClick={share} aria-live="polite">
      {copied ? <CheckIcon /> : <ShareIcon />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
