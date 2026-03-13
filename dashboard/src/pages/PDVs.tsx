import { useEffect, useState } from "react";

interface PDV {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  camera_count: number;
  cameras_online: number;
  cameras_offline: number;
}

function PDVs() {
  const [pdvs, setPdvs] = useState<PDV[]>([]);

  useEffect(() => {
    fetch("/api/pdvs")
      .then((res) => res.json())
      .then(setPdvs)
      .catch(console.error);
  }, []);

  const totalCameras = pdvs.reduce((s, p) => s + Number(p.camera_count), 0);
  const totalOnline = pdvs.reduce((s, p) => s + Number(p.cameras_online), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>
          PDVs ({pdvs.length} lojas, {totalOnline}/{totalCameras} câmeras online)
        </h2>
      </div>

      {pdvs.length === 0 ? (
        <p style={{ color: "#666" }}>Nenhum PDV cadastrado. Cadastre via API.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {pdvs.map((pdv) => (
            <div
              key={pdv.id}
              style={{
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <h3 style={{ margin: 0 }}>{pdv.name}</h3>
                <span
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    background: pdv.is_active ? "#e8f5e9" : "#ffebee",
                    color: pdv.is_active ? "#2e7d32" : "#c62828",
                  }}
                >
                  {pdv.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p style={{ margin: "0.5rem 0", color: "#666", fontSize: "0.875rem" }}>
                {pdv.address} — {pdv.city}/{pdv.state}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ color: "#4caf50" }}>
                  {pdv.cameras_online} online
                </span>
                <span style={{ color: "#f44336" }}>
                  {pdv.cameras_offline} offline
                </span>
                <span style={{ color: "#999" }}>
                  {pdv.camera_count} total
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PDVs;
