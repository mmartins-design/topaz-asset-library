"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { SearchIcon, CloseIcon } from "./icons";

export default function Header({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <header className="header">
      <Link href="/" className="logo" aria-label="Topaz Labs — Asset Library home">
        {/* Both logos render; CSS shows the one matching the theme (no hydration flash). */}
        <img src="/tpz-logo-dk.svg" alt="Topaz Labs" className="logo-light" />
        <img src="/tpz-logo-lt.svg" alt="" aria-hidden className="logo-dark" />
      </Link>
      <label className="search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search images and videos"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search assets"
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => onQuery("")} aria-label="Clear search">
            <CloseIcon />
          </button>
        )}
      </label>
      <ThemeToggle />
    </header>
  );
}
