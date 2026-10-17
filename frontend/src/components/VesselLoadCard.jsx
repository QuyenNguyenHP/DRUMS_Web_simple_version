import EngineLoadRingGauge from "./EngineLoadRingGauge";
import { engineId, STALE_AFTER_MS } from "../services/fleetLoad";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export default function VesselLoadCard({ vessel, readings, now, scaleMax }) {
  const engines = (vessel.engines ?? []).map((engine) => {
    const reading = readings[engineId(vessel.value, engine.key)];
    const stale = Boolean(reading?.timestamp && now - reading.timestamp > STALE_AFTER_MS);
    return {
      key: engine.key, label: engine.label ?? engine.key,
      load: reading?.load ?? null, timestamp: reading?.timestamp,
      warning: stale || Boolean(reading?.error),
      status: !reading ? "Loading..." : reading.error || (reading.load === null ? "No load data" : stale ? "Stale data" : !reading.timestamp ? "Timestamp unavailable" : "Latest reading"),
    };
  });
  const vesselTimestamps = engines
    .map((engine) => engine.timestamp)
    .filter((timestamp) => Number.isFinite(timestamp));
  const latestVesselTimestamp = vesselTimestamps.length
    ? Math.max(...vesselTimestamps)
    : null;
  const staleEngineCount = engines.filter((engine) => engine.status === "Stale data").length;

  return (
    <section className="fleet-vessel" aria-label={`${vessel.label ?? vessel.value} engine loads`}>
      <header>
        <div className="fleet-vessel-title"><img src="/vessel.svg" alt="" /><h2>{vessel.label ?? vessel.value}</h2></div>
        <span className={staleEngineCount ? "fleet-vessel-stale" : ""}>
          {engines.length} engines{staleEngineCount ? ` · ${staleEngineCount} stale` : ""}
        </span>
      </header>
      {engines.length ? <>
        <EngineLoadRingGauge engines={engines} max={scaleMax} vesselKey={vessel.value} />
        <p className="fleet-gauge-scale">
          Scale: 0–{number.format(scaleMax)} ekW
          <span>
            {latestVesselTimestamp
              ? `Latest data: ${new Date(latestVesselTimestamp).toLocaleString()}`
              : "Waiting for vessel data..."}
          </span>
        </p>
      </> : <p className="fleet-message">No engines configured for this vessel.</p>}
    </section>
  );
}
