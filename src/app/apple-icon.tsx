import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "78%",
            height: "78%",
            borderRadius: 999,
            background: "linear-gradient(145deg, #ff4d3a 0%, #ffb020 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "30%",
              height: "30%",
              borderRadius: 999,
              background: "#09090b",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
