import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigationType } from "react-router-dom";

import Overview from "./pages/Overview";
import Engine from "./pages/Engine";

const PAGE_META = {
  "/": {
    title: "Overview | HMI Starter",
    description: "Overview dashboard starter page.",
  },
  "/engine": {
    title: "Engine | HMI Starter",
    description: "Engine dashboard starter page.",
  },
  "/pressure_trend": {
    title: "Pressure Trend | HMI Starter",
    description: "Pressure trend dashboard starter page.",
  },
  "/exh_temp_trend": {
    title: "Exhaust Temperature Trend | HMI Starter",
    description: "Exhaust temperature trend dashboard starter page.",
  },
  "/fo-consumption": {
    title: "F.O. Consumption | HMI Starter",
    description: "Fuel oil consumption dashboard starter page.",
  },
  "/alarms": {
    title: "Alarms | HMI Starter",
    description: "Alarms dashboard starter page.",
  },
};

function App() {
  const action = useNavigationType();
  const location = useLocation();

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

  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/engine" element={<Engine />} />
      <Route path="/pressure_trend" element={<Overview />} />
      <Route path="/exh_temp_trend" element={<Overview />} />
      <Route path="/fo-consumption" element={<Overview />} />
      <Route path="/alarms" element={<Overview />} />
      <Route path="*" element={<Overview />} />
    </Routes>
  );
}

export default App;
