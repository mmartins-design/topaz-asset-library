type P = React.SVGProps<SVGSVGElement>;
const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const SunIcon = (p: P) => (
  <svg {...base} width={14} height={14} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const MoonIcon = (p: P) => (
  <svg {...base} width={14} height={14} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
);
export const ChevronDown = (p: P) => (
  <svg {...base} width={16} height={16} {...p}><path d="m6 9 6 6 6-6" /></svg>
);
export const ChevronLeft = (p: P) => (
  <svg {...base} width={22} height={22} {...p}><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base} width={22} height={22} {...p}><path d="m9 18 6-6-6-6" /></svg>
);
export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base} width={16} height={16} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const PlayIcon = (p: P) => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 4v16l13-8z" /></svg>
);
export const ImageIcon = (p: P) => (
  <svg {...base} width={16} height={16} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
);
export const VideoIcon = (p: P) => (
  <svg {...base} width={16} height={16} {...p}><rect x="2" y="5" width="15" height="14" rx="2" /><path d="m17 10 5-3v10l-5-3" /></svg>
);
