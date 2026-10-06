"use client";

export default function Switch({
  checked,
  onChange,
  label,
  icon,
  count,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="switch"
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-track"><span className="switch-thumb" /></span>
      {icon}
      <span>{label}</span>
      {count !== undefined && <span className="switch-count">{count}</span>}
    </button>
  );
}
