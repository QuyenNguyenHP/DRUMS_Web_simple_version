import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

import Overview from "./pages/Overview";
import EnginePage from "./pages/EnginePage";
import Graph from "./pages/Graph";
import AdminPage from "./pages/AdminPage";
import BackendConfigPage from "./pages/BackendConfigPage";
import LoginPage from "./pages/LoginPage";
import About from "./pages/About";
import {
  clearStoredSession,
  loadStoredSession,
  persistSession,
} from "./services/authApi";

const PAGE_META = {
  "/about": {
    title: "About DRUMS | Daikai Engineering",
    description: "Discover DRUMS vessel data collection, remote monitoring, analytics and security.",
  },
  "/admin/config": {
    title: "DRUMS APPLICATION",
    description: "Administrator backend configuration editor.",
  },
  "/": {
    title: "DRUMS APPLICATION",
    description: "Fleet overview showing engine load for every vessel.",
  },
  "/engine": {
    title: "Engine Page | DRUMS",
    description: "Detailed vessel engine monitoring.",
  },
  "/graph": {
    title: "DRUMS APPLICATION",
    description: "Graph dashboard page.",
  },
  "/pressure_trend": {
    title: "DRUMS APPLICATION",
    description: "Pressure trend dashboard starter page.",
  },
  "/exh_temp_trend": {
    title: "DRUMS APPLICATION",
    description: "Exhaust temperature trend dashboard starter page.",
  },
  "/fo-consumption": {
    title: "DRUMS APPLICATION",
    description: "Fuel oil consumption dashboard starter page.",
  },
  "/alarms": {
    title: "DRUMS APPLICATION",
    description: "Alarms dashboard starter page.",
  },
  "/admin": {
    title: "DRUMS APPLICATION",
    description: "Local user administration page.",
  },
};

function App() {
  const action = useNavigationType();
  const location = useLocation();
  const [session, setSession] = useState(() => loadStoredSession());
  const isAdmin = session?.user?.role === "admin";

  const handleLogin = (nextSession) => {
    persistSession(nextSession);
    setSession(nextSession);
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
  };

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [action, location.pathname]);

  useEffect(() => {
    const currentMeta = PAGE_META[location.pathname] ?? PAGE_META["/"];
    document.title = currentMeta.title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute("content", currentMeta.description);
    }
  }, [location.pathname]);

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route path="/about" element={<About user={session.user} onLogout={handleLogout} />} />
      <Route
        path="/admin/config"
        element={isAdmin ? (
          <BackendConfigPage authToken={session.token} user={session.user} onLogout={handleLogout} />
        ) : <Navigate to="/" replace />}
      />
      <Route path="/" element={<Overview user={session.user} onLogout={handleLogout} />} />
      <Route
        path="/graph"
        element={<Graph user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/pressure_trend"
        element={<Graph user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/exh_temp_trend"
        element={<Graph user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/fo-consumption"
        element={<Graph user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/alarms"
        element={<Graph user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/admin"
        element={
          isAdmin ? (
            <AdminPage
              authToken={session.token}
              user={session.user}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="/engine" element={<EnginePage user={session.user} onLogout={handleLogout} />} />
      <Route path="/overview" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
