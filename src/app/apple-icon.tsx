import { ImageResponse } from "next/og";

// iOS home-screen icon: the Topaz mark on white (iOS doesn't allow transparency).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff", padding: 32 }}>
        <svg viewBox="0 0 256 256" width="116" height="116">
          <rect x="0" y="170.67" width="85.33" height="85.33" fill="#000" />
          <rect x="85.33" y="85.33" width="85.33" height="85.33" fill="#000" />
          <rect x="170.67" y="0" width="85.33" height="85.33" fill="#000" />
        </svg>
      </div>
    ),
    size,
  );
}
