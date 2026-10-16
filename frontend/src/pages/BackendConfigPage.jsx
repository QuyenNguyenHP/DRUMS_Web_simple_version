import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NavigationSidebar from "../components/NavigationSidebar";
import { fetchBackendConfig, saveBackendConfig } from "../services/authApi";

const BackendConfigPage = ({ authToken, user, onLogout }) => {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [revision, setRevision] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const dirty = draft !== saved;

  const accept = (payload) => {
    const text = JSON.stringify(payload.config, null, 2);
    setDraft(text);
    setSaved(text);
    setRevision(payload.revision);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    let active = true;
    fetchBackendConfig(authToken)
      .then((payload) => { if (active) accept(payload); })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [authToken]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const reload = async () => {
    if (dirty && !window.confirm("Discard unsaved changes and reload configuration?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try { accept(await fetchBackendConfig(authToken)); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  const parseDraft = () => {
    const config = JSON.parse(draft);
    if (!config || Array.isArray(config) || typeof config !== "object") {
      throw new Error("Configuration must be a JSON object.");
    }
    return config;
  };

  const save = async () => {
    setError("");
    setMessage("");
    try {
      const config = parseDraft();
      setBusy(true);
      const payload = await saveBackendConfig(authToken, { config, revision });
      accept(payload);
      if (payload.restartScheduled) {
        setMessage("Configuration saved. Backend restart scheduled; the service may be unavailable briefly. Your session will be kept.");
      } else {
        setError(payload.warning || "Configuration saved, but the backend still needs restarting.");
      }
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  const format = () => {
    setError("");
    try { setDraft(JSON.stringify(parseDraft(), null, 2)); }
    catch (cause) { setError(cause.message); }
  };

  const buttonClass = "rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="flex min-h-screen flex-col bg-[#07111f] text-slate-100">
      <Header user={user} onLogout={onLogout} />
      <main className="flex flex-1 flex-col lg:flex-row">
        <NavigationSidebar user={user} className="w-full lg:w-56 lg:min-w-56" />
        <section className="min-w-0 flex-1 space-y-4 p-4 lg:p-6" aria-busy={busy}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Backend configuration</h1>
              <p className="mt-2 text-sm text-slate-400">Edit database connections, vessels, engines and graph settings.</p>
              <p className="mt-1 text-sm text-amber-300">Saving automatically restarts the backend to apply changes.</p>
            </div>
            <span className="rounded-full border border-sky-800 bg-sky-950 px-3 py-1 text-xs text-sky-300">Admin only</span>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-200">{message}</p>}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="backend-config-json" className="font-semibold">backend_config.json</label>
              <span className="text-xs text-slate-400">{busy ? "Loading / saving…" : dirty ? "Unsaved changes" : revision ? "Saved" : "Not loaded"}</span>
            </div>
            <textarea
              id="backend-config-json"
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setMessage(""); }}
              disabled={busy || !revision}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              className="min-h-[60vh] w-full resize-y rounded-lg border border-slate-600 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-200 outline-none focus:border-sky-400 disabled:opacity-60"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={save} disabled={busy || !revision} className={`${buttonClass} border-blue-500 bg-blue-600 hover:bg-blue-500`}>Save and restart backend</button>
              <button type="button" onClick={format} disabled={busy || !revision} className={buttonClass}>Format JSON</button>
              <button type="button" onClick={reload} disabled={busy} className={buttonClass}>Reload from server</button>
            </div>
          </div>
        </section>
      </main>
      <Footer lastUpdated={lastUpdated} />
    </div>
  );
};

export default BackendConfigPage;
