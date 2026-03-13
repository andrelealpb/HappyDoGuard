import { useEffect, useState } from "react";
import HlsPlayer from "../components/HlsPlayer";

interface Camera {
  id: string;
  name: string;
  stream_key: string;
  status: "online" | "offline" | "error";
  pdv_name: string;
}

function Live() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

  useEffect(() => {
    fetch("/api/cameras")
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const filtered = cameras.filter((c) =>
    filter === "all" ? true : c.status === filter
  );

  const onlineCount = cameras.filter((c) => c.status === "online").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>
          Câmeras ao Vivo ({onlineCount}/{cameras.length} online)
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["all", "online", "offline"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.4rem 0.8rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                background: filter === f ? "#1a1a2e" : "#fff",
                color: filter === f ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              {f === "all" ? "Todas" : f === "online" ? "Online" : "Offline"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#666" }}>
          <p>Nenhuma câmera encontrada.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: "1rem",
          }}
        >
          {filtered.map((camera) => (
            <div
              key={camera.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#000",
              }}
            >
              {camera.status === "online" ? (
                <HlsPlayer src={`/hls/${camera.stream_key}.m3u8`} autoPlay muted />
              ) : (
                <div
                  style={{
                    aspectRatio: "16/9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                    fontSize: "0.875rem",
                  }}
                >
                  Câmera offline
                </div>
              )}
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
                <div>
                  <div style={{ fontWeight: 600 }}>{camera.name}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                    {camera.pdv_name}
                  </div>
                </div>
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
      )}
    </div>
  );
}

export default Live;
