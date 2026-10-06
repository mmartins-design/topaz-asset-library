"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "./icons";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      className="theme-toggle"
      suppressHydrationWarning
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span className="theme-toggle-icon"><SunIcon /></span>
      <span className="theme-toggle-icon"><MoonIcon /></span>
      <span className="theme-toggle-thumb" />
    </button>
  );
}
