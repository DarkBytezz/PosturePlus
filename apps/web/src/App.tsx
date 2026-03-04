import { useState } from "react";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Monitor from "./pages/Monitor";
import Reports from "./pages/Reports";
import LoginPage from "./pages/LoginPage";
import { PostureProvider } from "./context/PostureContext";
import { useAuth } from "./hooks/useAuth";

function AppInner() {
  const { user, loading} = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}>
        <span className="w-2 h-2 rounded-full animate-blink"
          style={{ background: "var(--accent-primary)" }} />
      </div>
    );
  }

  // Only gate behind login if Supabase is configured
  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "monitor":   return <Monitor />;
      case "reports":   return <Reports />;
      case "settings":  return (
        <div className="p-8 flex items-center justify-center h-full">
          <p style={{ color: "var(--text-muted)" }}>Settings — coming soon</p>
        </div>
      );
      default: return <Dashboard />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
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