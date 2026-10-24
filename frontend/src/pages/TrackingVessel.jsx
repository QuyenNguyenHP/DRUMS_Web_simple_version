import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import "./Overview.css";
import "./TrackingVessel.css";

let leafletPromise;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/vendor/leaflet/leaflet.css";
    document.head.append(css);
    const script = document.createElement("script");
    script.src = "/vendor/leaflet/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => { leafletPromise = null; script.remove(); reject(new Error("Map could not load. Reload the page to try again.")); };
    document.head.append(script);
  });
  return leafletPromise;
}
const hasPosition = (v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude) && Math.abs(v.latitude) <= 90 && Math.abs(v.longitude) <= 180;
const timestamp = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : "Unknown";
const value = (number, unit = "") => Number.isFinite(number) ? `${number}${unit}` : "—";

export default function TrackingVessel({ user, onLogout }) {
  const [fleet, setFleet] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");
  const [checked, setChecked] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [ready, setReady] = useState(false);
  const mapElement = useRef(null);
  const map = useRef(null);
  const markers = useRef(null);
  const initialFit = useRef(false);
  const selected = fleet.find((v) => String(v.mmsi) === selectedId);
  const located = fleet.filter(hasPosition);
  const visible = fleet.filter((v) => (filter !== "position" || hasPosition(v)) && [v.name, v.mmsi, v.imo].some((field) => String(field ?? "").toLowerCase().includes(query.trim().toLowerCase())));

  useEffect(() => {
    let active = true;
    let timer;
    let controller;
    async function poll() {
      controller = new AbortController();
      setLoading(true);
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch("/api/tracking/vessels", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to refresh vessel positions.");
        if (!Array.isArray(data)) throw new Error("Invalid vessel response.");
        if (active) { setFleet(data); setError(""); setChecked(Date.now()); }
      } catch (failure) {
        if (active) setError(failure.name === "AbortError" ? "Tracking request timed out. Please retry." : failure.message);
      } finally {
        window.clearTimeout(timeout);
        if (active) { setLoading(false); timer = window.setTimeout(poll, 60000); }
      }
    }
    poll();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    let observer;
    loadLeaflet().then((L) => {
      if (!active) return;
      map.current = L.map(mapElement.current).setView([1.3, 103.8], 4);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        maxZoom: 19,
      }).on("tileerror", () => { if (active) setMapError("Map tiles are unavailable. Check your internet connection."); }).addTo(map.current);
      markers.current = L.layerGroup().addTo(map.current);
      observer = new ResizeObserver(() => map.current?.invalidateSize());
      observer.observe(mapElement.current);
      setReady(true);
    }).catch((failure) => { if (active) setMapError(failure.message); });
    return () => { active = false; observer?.disconnect(); map.current?.remove(); map.current = null; initialFit.current = false; };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    const L = window.L;
    markers.current.clearLayers();
    fleet.filter(hasPosition).forEach((v) => {
      const chosen = String(v.mmsi) === selectedId;
      const course = Number.isFinite(v.course) && v.course >= 0 && v.course < 360 ? v.course : null;
      const directionLabel = course === null ? "Course unavailable" : `Course ${course}°`;
      const symbol = course === null
        ? '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="8" class="tracking-direction-unknown" /></svg>'
        : `<img src="/directional-vessel-marker.svg" alt="" aria-hidden="true" style="transform:rotate(${course}deg)" />`;
      const icon = L.divIcon({ className: "tracking-marker", html: `<span class="tracking-ship ${chosen ? "selected" : ""}">${symbol}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
      const label = document.createElement("span");
      label.textContent = `${v.name || String(v.mmsi)} · ${directionLabel}`;
      L.marker([v.latitude, v.longitude], { icon, title: label.textContent }).bindTooltip(label).on("click", () => setSelectedId(String(v.mmsi))).addTo(markers.current);
    });
    const points = fleet.filter(hasPosition).map((v) => [v.latitude, v.longitude]);
    if (!initialFit.current && points.length) { map.current.fitBounds(points, { padding: [50, 50], maxZoom: 9 }); initialFit.current = true; }
  }, [fleet, selectedId, ready]);

  useEffect(() => {
    if (ready && selected && hasPosition(selected)) map.current?.setView([selected.latitude, selected.longitude], 9);
  }, [selectedId, ready]);

  function fitFleet() {
    if (located.length && map.current) map.current.fitBounds(located.map((v) => [v.latitude, v.longitude]), { padding: [50, 50], maxZoom: 9 });
  }

  return <div className="fleet-shell">
    <Header user={user} onLogout={onLogout} />
    <div className="fleet-layout">
      <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" />
      <main className="fleet-main tracking-main">
        <header className="fleet-heading"><div><p className="fleet-eyebrow">FLEET MONITORING / AIS</p><h1>Tracking Vessel</h1><p>Your fleet. One map. Latest known positions.</p></div><button className="tracking-button" disabled={loading} onClick={() => setRefresh((n) => n + 1)}>{loading ? "Refreshing…" : "Refresh positions"}</button></header>
        <div className="fleet-summary tracking-summary"><div><strong>{fleet.length}</strong><span>Monitored vessels</span></div><div><strong>{located.length}</strong><span>Saved positions</span></div><div><strong>{fleet.length - located.length}</strong><span>Awaiting position</span></div><div className="tracking-source"><strong>OpenWaters</strong><span>Latest saved AIS observations</span></div></div>
        {error && <div className="fleet-message fleet-error" role="alert">{error}{checked && " Previously loaded positions remain visible."}</div>}
        <div className="tracking-workspace">
          <section className="tracking-panel" aria-label="Tracked vessels">
            <div className="tracking-panel-heading"><h2>Tracked vessels <span>{visible.length}</span></h2><label className="fleet-search">Search fleet<input type="search" placeholder="Vessel name, MMSI or IMO" value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="tracking-filters"><button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All vessels</button><button aria-pressed={filter === "position"} onClick={() => setFilter("position")}>With position</button></div></div>
            <div className="tracking-list">{visible.map((v) => <button key={v.mmsi} className="tracking-vessel" aria-pressed={selectedId === String(v.mmsi)} onClick={() => setSelectedId(String(v.mmsi))}><strong>{v.name || v.mmsi}</strong><small>IMO {v.imo || "—"} · MMSI {v.mmsi}</small><span className={hasPosition(v) ? "tracking-available" : "tracking-pending"}>{hasPosition(v) ? "● Saved position" : "○ Awaiting position"}</span></button>)}{!visible.length && <p className="tracking-empty" role="status">{loading ? "Loading vessels…" : error && !checked ? "Fleet unavailable. Retry when the tracking service is running." : fleet.length ? "No vessels match your search." : "No vessels configured. Add vessels to VesselTrackingMap’s config.json."}</p>}</div>
          </section>
          <section className="tracking-map-panel" aria-label="Vessel map"><div className="tracking-map-toolbar"><span><i /> Latest known positions</span><button className="tracking-button" onClick={fitFleet} disabled={!ready || !located.length}>Fit fleet</button></div><div ref={mapElement} className="tracking-map" aria-label="Interactive vessel position map" />{mapError && <p className="tracking-map-error" role="alert">{mapError}</p>}<div className="tracking-map-caption">Select a vessel marker or a vessel from the list to inspect its AIS report.</div></section>
        </div>
        <section className="tracking-details" aria-label="Selected vessel details" aria-live="polite">{selected ? <><div className="tracking-detail-title"><div><p className="fleet-eyebrow">VESSEL DETAILS</p><h2>{selected.name || selected.mmsi}</h2></div><span>{hasPosition(selected) ? "Latest saved observation" : "Waiting for an AIS position"}</span></div><dl>{[["MMSI", selected.mmsi], ["IMO", selected.imo || "—"], ["Speed", value(selected.speed, " kn")], ["Course", value(selected.course, "°")], ["Latitude", value(selected.latitude, "°")], ["Longitude", value(selected.longitude, "°")], ["Position time", timestamp(selected.timestamp)], ["Data source", selected.provider || "OpenWaters"]].map(([label, data]) => <div key={label}><dt>{label}</dt><dd>{data}</dd></div>)}</dl></> : <div className="tracking-empty">Select a vessel to see its position, speed, course and observation time.</div>}</section>
        <footer className="fleet-footer"><span>{checked ? `Last refresh: ${new Date(checked).toLocaleString()}` : "Waiting for tracking data"}</span><span>Refreshes every minute · Saved AIS positions are not real-time locations.</span></footer>
      </main>
    </div>
  </div>;
}
