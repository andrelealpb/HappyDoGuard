import { useEffect, useState } from "react";

interface Camera {
  id: string;
  name: string;
  pdv_name: string;
}

interface Recording {
  id: string;
  camera_name: string;
  file_path: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
}

function Playback() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    fetch("/api/cameras")
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const searchByTimestamp = () => {
    if (!selectedCamera || !timestamp) return;
    fetch(`/api/cameras/${selectedCamera}/recording?timestamp=${timestamp}`)
      .then((res) => res.json())
      .then((data) => setRecordings(data.error ? [] : [data]))
      .catch(console.error);
  };

  const loadRecordings = () => {
    if (!selectedCamera) return;
    fetch(`/api/cameras/${selectedCamera}/recordings?limit=20`)
      .then((res) => res.json())
      .then(setRecordings)
      .catch(console.error);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Gravações</h2>

      <div
        style={{
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "8px",
          border: "1px solid #ddd",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Buscar por momento exato</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            style={{ padding: "0.5rem", minWidth: "200px" }}
          >
            <option value="">Selecione a câmera</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.pdv_name} — {c.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            style={{ padding: "0.5rem" }}
          />
          <button
            onClick={searchByTimestamp}
            style={{
              padding: "0.5rem 1rem",
              background: "#1a1a2e",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Buscar
          </button>
          <button
            onClick={loadRecordings}
            style={{
              padding: "0.5rem 1rem",
              background: "#555",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Listar recentes
          </button>
        </div>
      </div>

      {recordings.length === 0 ? (
        <p style={{ color: "#666" }}>
          Selecione uma câmera e busque por data/hora ou liste as gravações recentes.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ background: "#1a1a2e", color: "#fff" }}>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Câmera</th>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Início</th>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Fim</th>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Arquivo</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.75rem" }}>{r.camera_name}</td>
                <td style={{ padding: "0.75rem" }}>
                  {new Date(r.started_at).toLocaleString("pt-BR")}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  {r.ended_at ? new Date(r.ended_at).toLocaleString("pt-BR") : "—"}
                </td>
                <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {r.file_path}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Playback;
