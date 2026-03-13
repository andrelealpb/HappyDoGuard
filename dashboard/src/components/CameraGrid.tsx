import { useEffect, useState } from "react";
import HlsPlayer from "./HlsPlayer";

interface Camera {
  id: string;
  name: string;
  stream_key: string;
  status: "online" | "offline" | "error";
  store_id: string;
}

function CameraGrid() {
  const [cameras, setCameras] = useState<Camera[]>([]);

  useEffect(() => {
    fetch("/api/cameras")
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  if (cameras.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#666" }}>
        <h2>No cameras registered</h2>
        <p>Register cameras via the API to start monitoring.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
        gap: "1rem",
      }}
    >
      {cameras.map((camera) => (
        <div
          key={camera.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <HlsPlayer
            src={`/hls/${camera.stream_key}.m3u8`}
            autoPlay
            muted
          />
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "#1a1a2e",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{camera.name}</span>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: camera.status === "online" ? "#4caf50" : "#f44336",
                display: "inline-block",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default CameraGrid;
