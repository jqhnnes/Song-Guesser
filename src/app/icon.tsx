import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            width: "72%",
            height: "72%",
            borderRadius: 999,
            background: "linear-gradient(145deg, #ff4d3a 0%, #ffb020 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "28%",
              height: "28%",
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
