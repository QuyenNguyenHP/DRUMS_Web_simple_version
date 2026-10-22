import { useEffect, useState } from "react";
import VesselLoadCard from "../components/VesselLoadCard";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import { fetchVesselConfig } from "../services/apiClient";
import { fetchEngineMonitorData } from "../services/pidMonitorApi";
import { pollFleet, FLEET_POLL_MS, engineId } from "../services/fleetLoad";
import "./Overview.css";

const formatTime = (timestamp) => new Date(timestamp).toLocaleString();

export default function Overview({ user, onLogout }) {
  const [vessels, setVessels] = useState([]);
  const [readings, setReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let active = true;
    setLoading(true);
    setError("");
    fetchVesselConfig({ includeLatestRange: false, signal: controller.signal })
      .then((response) => {
        if (active) setVessels(Array.isArray(response?.vessels) ? response.vessels : []);
      })
      .catch((failure) => {
        if (active) setError(failure?.name === "AbortError" ? "Loading vessels timed out. Please try again." : "Unable to load vessels. Please try again.");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    const jobs = vessels.flatMap((vessel) => (vessel.engines ?? []).map((engine) => ({ vessel: vessel.value, engine: engine.key })));
    setReadings({});
    setLastChecked(null);
    async function refresh() {
      await pollFleet(jobs, fetchEngineMonitorData, controller.signal, (job, reading) => {
        setReadings((previous) => ({ ...previous, [engineId(job.vessel, job.engine)]: reading }));
      });
      if (!controller.signal.aborted) {
        setLastChecked(Date.now());
        setNow(Date.now());
        timer = window.setTimeout(refresh, FLEET_POLL_MS);
      }
    }
    if (jobs.length) refresh();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [vessels]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const engineCount = vessels.reduce((count, vessel) => count + (vessel.engines?.length ?? 0), 0);
  const available = Object.values(readings).filter((reading) => reading.load !== null && !reading.error).length;
  const visibleVessels = vessels.filter((vessel) => String(vessel.label ?? vessel.value).toLowerCase().includes(search.trim().toLowerCase()));

  const scaleMax = 600;

  return (
    <div className="fleet-shell">
      <Header user={user} onLogout={onLogout} />
      <div className="fleet-layout">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" />
        <main className="fleet-main">
          <header className="fleet-heading">
            <div><p className="fleet-eyebrow">FLEET MONITORING</p><h1>Overview</h1><p>Engine Load across all vessels</p></div>
            <label className="fleet-search">Find a vessel<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vessel name" /></label>
          </header>
          <div className="fleet-summary">
            <div><strong>{vessels.length}</strong><span>Vessels</span></div>
            <div><strong>{engineCount}</strong><span>Engines</span></div>
            <div><strong>{available}<small> / {engineCount}</small></strong><span>Load readings available</span></div>
          </div>
          <p className="fleet-note">Load is shown in ekW. Data older than 40 minutes is marked stale. Requests refresh 10 seconds after each completed cycle.</p>
          {loading && <p className="fleet-message" role="status">Loading vessels...</p>}
          {error && <div className="fleet-message fleet-error" role="alert">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
          {!loading && !error && vessels.length === 0 && <p className="fleet-message">No vessels configured.</p>}
          {!loading && !error && vessels.length > 0 && visibleVessels.length === 0 && <p className="fleet-message">No vessels match your search.</p>}
          <div className="fleet-grid">
            {visibleVessels.map((vessel) => (
              <VesselLoadCard key={vessel.value} vessel={vessel} readings={readings} now={now} scaleMax={scaleMax} />
            ))}
          </div>
          <footer className="fleet-footer">{lastChecked ? `Last completed check: ${formatTime(lastChecked)}` : "Waiting for the first data check"}<span>Select an engine to view details</span></footer>
        </main>
      </div>
    </div>
  );
}
