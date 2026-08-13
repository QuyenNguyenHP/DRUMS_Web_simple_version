import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

import Overview from "./pages/Overview";
import Engine from "./pages/Engine";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import {
  clearStoredSession,
  loadStoredSession,
  persistSession,
} from "./services/authApi";

const PAGE_META = {
  "/": {
    title: "DRUMS APPLICATION",
    description: "Overview dashboard starter page.",
  },
  "/engine": {
    title: "DRUMS APPLICATION",
    description: "Engine dashboard starter page.",
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
    return <LoginPage onLogin={handleLogin} setupRequired />;
  }

  return (
    <Routes>
      <Route path="/" element={<Overview user={session.user} onLogout={handleLogout} />} />
      <Route
        path="/engine"
        element={<Engine user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/pressure_trend"
        element={<Overview user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/exh_temp_trend"
        element={<Overview user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/fo-consumption"
        element={<Overview user={session.user} onLogout={handleLogout} />}
      />
      <Route
        path="/alarms"
        element={<Overview user={session.user} onLogout={handleLogout} />}
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
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
