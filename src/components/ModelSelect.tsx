"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDown } from "./icons";

/** Pexels-style filter dropdown listing every model folder with its asset count. */
export default function ModelSelect({
  models,
  counts,
  value,
  onChange,
}: {
  models: string[];
  counts: Record<string, number>;
  value: string | null;
  onChange: (m: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const options: { value: string | null; label: string; count: number }[] = [
    { value: null, label: "All models", count: total },
    ...models.map((m) => ({ value: m, label: m, count: counts[m] ?? 0 })),
  ];

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-active={!!value}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value ?? "All models"}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="dropdown-chevron">
          <ChevronDown />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Model"
            className="dropdown-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {options.map((o) => (
              <li key={o.label}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className="dropdown-option"
                  disabled={o.count === 0 && o.value !== value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className="dropdown-check">{o.value === value && <CheckIcon />}</span>
                  <span className="dropdown-label">{o.label}</span>
                  <span className="dropdown-count">{o.count}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
