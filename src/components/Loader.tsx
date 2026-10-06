/** Loading indicator built from the three squares of the Topaz mark. */
export default function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loader" role="status" aria-label={label}>
      <svg viewBox="0 0 100 100" width="44" height="44" aria-hidden>
        <rect className="loader-sq loader-sq-1" x="0" y="66.8" width="33.2" height="33.2" />
        <rect className="loader-sq loader-sq-2" x="33.3" y="33.5" width="33.2" height="33.2" />
        <rect className="loader-sq loader-sq-3" x="66.7" y="0" width="33.2" height="33.2" />
      </svg>
    </div>
  );
}
