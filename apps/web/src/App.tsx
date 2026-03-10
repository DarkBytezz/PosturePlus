import { useState } from "react";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Monitor from "./pages/Monitor";
import Reports from "./pages/Reports";
import LandingPage from "./pages/LandingPage";
import { PostureProvider } from "./context/PostureContext";
import { useAuth } from "./hooks/useAuth";

function AppInner() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isGuest, setIsGuest] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "#F5EFE4" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.4rem", fontWeight: 700, color: "#2C1810",
            marginBottom: "0.5rem",
          }}>
            Posture<span style={{ color: "#5C7A3E" }}>+</span>
          </div>
          <span className="w-2 h-2 rounded-full animate-blink inline-block"
            style={{ background: "#5C7A3E" }} />
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LandingPage onGuestEnter={() => setIsGuest(true)} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "monitor": return <Monitor />;
      case "reports": return <Reports />;
      case "settings": return (
        <div className="p-8 flex items-center justify-center h-full">
          <p style={{ color: "var(--text-muted)" }}>Settings — coming soon</p>
        </div>
      );
      default: return <Dashboard />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab} isGuest={isGuest} onExitGuest={() => setIsGuest(false)}>
      {renderPage()}
    </AppLayout>
  );
}

function App() {
  return (
    <PostureProvider>
      <AppInner />
    </PostureProvider>
  );
}

export default App;