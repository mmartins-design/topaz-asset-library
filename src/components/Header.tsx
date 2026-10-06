"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { SearchIcon, CloseIcon } from "./icons";

/**
 * Site header. With `onQuery` the search filters live (gallery); without it the
 * search box submits to the gallery as /?q=… (asset pages).
 */
export default function Header({ query, onQuery }: { query?: string; onQuery?: (q: string) => void }) {
  const live = !!onQuery;
  return (
    <header className="header">
      <Link href="/" className="logo" aria-label="Topaz Labs — Asset Library home">
        {/* Both logos render; CSS shows the one matching the theme (no hydration flash). */}
        <img src="/tpz-logo-dk.svg" alt="Topaz Labs" className="logo-light" />
        <img src="/tpz-logo-lt.svg" alt="" aria-hidden className="logo-dark" />
      </Link>
      <form className="search" action="/" method="get" role="search" onSubmit={live ? (e) => e.preventDefault() : undefined}>
        <SearchIcon />
        <input
          type="search"
          name="q"
          placeholder="Search images and videos"
          aria-label="Search assets"
          {...(live ? { value: query, onChange: (e) => onQuery(e.target.value) } : {})}
        />
        {live && query && (
          <button type="button" className="search-clear" onClick={() => onQuery("")} aria-label="Clear search">
            <CloseIcon />
          </button>
        )}
      </form>
      <ThemeToggle />
    </header>
  );
}
