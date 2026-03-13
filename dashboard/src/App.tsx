import { Routes, Route } from "react-router-dom";
import CameraGrid from "./components/CameraGrid";

function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          padding: "1rem 2rem",
          background: "#1a1a2e",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>HappyDo Guard</h1>
        <span style={{ opacity: 0.7, fontSize: "0.875rem" }}>
          Video Monitoring System
        </span>
      </header>
      <main style={{ padding: "1rem" }}>
        <Routes>
          <Route path="/" element={<CameraGrid />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
