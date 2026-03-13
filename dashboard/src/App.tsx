import { Routes, Route, NavLink } from "react-router-dom";
import Live from "./pages/Live";
import Playback from "./pages/Playback";
import PDVs from "./pages/PDVs";
import Settings from "./pages/Settings";

const navItems = [
  { to: "/", label: "Ao Vivo" },
  { to: "/playback", label: "Gravações" },
  { to: "/pdvs", label: "PDVs" },
  { to: "/settings", label: "Configurações" },
];

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: "#fff",
  textDecoration: "none",
  padding: "0.5rem 1rem",
  borderRadius: "4px",
  background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
  fontSize: "0.875rem",
});

function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f5f5f5" }}>
      <header
        style={{
          padding: "0.75rem 2rem",
          background: "#1a1a2e",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", whiteSpace: "nowrap" }}>
          HappyDo Guard
        </h1>
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} style={navLinkStyle} end>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main style={{ padding: "1.5rem" }}>
        <Routes>
          <Route path="/" element={<Live />} />
          <Route path="/playback" element={<Playback />} />
          <Route path="/pdvs" element={<PDVs />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
