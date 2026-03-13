function Settings() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Configurações</h2>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1.5rem",
          maxWidth: "600px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Servidor RTMP</h3>
        <table style={{ width: "100%", fontSize: "0.875rem" }}>
          <tbody>
            <tr>
              <td style={{ padding: "0.5rem 0", fontWeight: 600 }}>Ingest URL</td>
              <td style={{ fontFamily: "monospace" }}>rtmp://servidor:1935/live/</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem 0", fontWeight: 600 }}>HLS Playback</td>
              <td style={{ fontFamily: "monospace" }}>http://servidor:8080/hls/</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem 0", fontWeight: 600 }}>Stats</td>
              <td>
                <a
                  href="/hls/../stat"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#1a1a2e" }}
                >
                  Nginx-RTMP Stats (XML)
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>Sistema</h3>
        <p style={{ fontSize: "0.875rem", color: "#666" }}>
          Gestão de usuários, API keys e webhooks será implementada nas próximas fases.
        </p>
      </div>
    </div>
  );
}

export default Settings;
