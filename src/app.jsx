// ── Composición del dashboard: estado, polling de APIs y armado del layout ──
const { useState, useEffect, useMemo, useRef } = React;

// ── Watchdog: ante un error no manejado (o un render roto), recarga sola la
// página en vez de quedar en blanco hasta que alguien la note. También hace
// un refresh preventivo de madrugada para cortar cualquier leak acumulado
// (ej. horas de video en vivo) antes de que llegue a crashear. ──
const RELOAD_LOG_KEY = 'shugohub_reload_log';
const MAX_RELOADS_IN_WINDOW = 3;
const RELOAD_WINDOW_MS = 2 * 60 * 1000;
const PREVENTIVE_RELOAD_HOUR = 5; // 05:00, horario de baja actividad

function tooManyReloads() {
  let log = [];
  try { log = JSON.parse(sessionStorage.getItem(RELOAD_LOG_KEY) || '[]'); } catch (e) {}
  const now = Date.now();
  log = log.filter((ts) => now - ts < RELOAD_WINDOW_MS);
  const tooMany = log.length >= MAX_RELOADS_IN_WINDOW;
  log.push(now);
  try { sessionStorage.setItem(RELOAD_LOG_KEY, JSON.stringify(log)); } catch (e) {}
  return tooMany;
}

function reloadSoon(reason) {
  console.error('[ShugoHub watchdog] ' + reason + ' — recargando en 3s');
  if (tooManyReloads()) {
    console.error('[ShugoHub watchdog] demasiados reloads seguidos, dejo de reintentar (error persistente)');
    return;
  }
  setTimeout(() => location.reload(), 3000);
}

window.addEventListener('error', (e) => reloadSoon('Error: ' + (e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason && e.reason.message ? e.reason.message : e.reason;
  reloadSoon('Promise rechazada: ' + reason);
});

(function schedulePreventiveReload() {
  const next = new Date();
  next.setHours(PREVENTIVE_RELOAD_HOUR, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  setTimeout(() => location.reload(), next.getTime() - Date.now());
})();

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    console.error('[ShugoHub watchdog] Error de render:', error, info.componentStack);
    reloadSoon('Error de render: ' + error.message);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24, color: "#667", fontFamily: "monospace" }}>Reiniciando…</div>;
    }
    return this.props.children;
  }
}

function readLocalStorage(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function writeLocalStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function App() {
  const [t, setTweak] = window.useTweaks({
    "dense":          false,
    "stationUrl":     readLocalStorage('shugohub_radio_station')
      || "https://playerservices.streamtheworld.com/api/livestream-redirect/ASPEN.mp3",
    "shugoVisionUrl": "http://shugovision.dposs.gob.ar",
    "shugoTimeUrl":   "http://relojes.dposs.gob.ar",
    "splitPct":       37,
    "splitPct2":      45,
  });

  const audioRef = useRef(null);
  // Si antes de la última recarga la radio estaba sonando, intentamos retomarla sola.
  // Depende de que el navegador permita autoplay con sonido (kiosk/TV suele tenerlo
  // habilitado); si el navegador lo bloquea, vuelve a quedar en pausa sin romper nada.
  const [playing, setPlaying] = useState(() => readLocalStorage('shugohub_radio_playing') === '1');
  const [vol, setVol]         = useState(100);

  // -- live API data --
  const [vms,      setVms]      = useState(window.VMS_MOCK);
  const [clocks,   setClocks]   = useState(window.CLOCKS_MOCK);
  const [lastFetch, setLastFetch]     = useState(null);
  const [fichadas, setFichadas]       = useState(0);
  const [lastCycleStr, setLastCycleStr] = useState(null);
  const [temp, setTemp] = useState(null);
  const [tickets, setTickets] = useState({ pendientes: [], reabiertos: [], infoextra: [] });
  const [ticketsModalTab, setTicketsModalTab] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentModal, setAgentModal] = useState(null);
  const [agentsExpanded, setAgentsExpanded] = useState(false);

  // Temperatura Ushuaia: actualizar cada 10 min
  useEffect(() => {
    async function fetchTemp() {
      try {
        const r = await fetch('/api/weather/forecast?latitude=-54.8019&longitude=-68.3030&current=temperature_2m');
        if (!r.ok) throw new Error(r.status);
        const data = await r.json();
        const t = data.current?.temperature_2m;
        if (t != null) setTemp(Math.round(t));
      } catch(e) {
        console.warn('[ShugoHub] Weather fetch:', e.message);
      }
    }
    fetchTemp();
    const id = setInterval(fetchTemp, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // VMs: poll every 10s
  useEffect(() => {
    async function loadVMs() {
      try {
        const r = await fetch(window.API_VMS);
        if (!r.ok) throw new Error(r.status);
        const raw = await r.json();
        const arr = Array.isArray(raw) ? raw : (raw.data || raw.vms || raw.results || []);
        setVms(arr.map(window.normalizeVM));
        setLastFetch(new Date());
      } catch (e) {
        console.warn('[ShugoHub] VMs fetch:', e.message);
      }
    }
    loadVMs();
    const id = setInterval(loadVMs, window.POLL_VMS_MS);
    return () => clearInterval(id);
  }, []);

  // Relojes: poll every 30s
  useEffect(() => {
    async function loadHub() {
      try {
        const r = await fetch(window.API_HUB);
        if (!r.ok) throw new Error(r.status);
        const raw = await r.json();
        const arr = raw.relojes || (Array.isArray(raw) ? raw : (raw.data || raw.clocks || []));
        setClocks(arr.map(window.normalizeClock));
        if (raw.ultimo_ciclo_fichadas != null) setFichadas(raw.ultimo_ciclo_fichadas);
        if (raw.ultimo_ciclo_inicio) {
          const parts = raw.ultimo_ciclo_inicio.split(' ');
          setLastCycleStr(parts[1] || raw.ultimo_ciclo_inicio);
        }
      } catch (e) {
        console.warn('[ShugoHub] Hub fetch:', e.message);
      }
    }
    loadHub();
    const id = setInterval(loadHub, window.POLL_HUB_MS);
    return () => clearInterval(id);
  }, []);

  // Tickets mesa de ayuda: poll every 30s
  useEffect(() => {
    async function loadTickets() {
      try {
        const r = await fetch(window.API_TICKETS);
        if (!r.ok) throw new Error(r.status);
        const raw = await r.json();
        setTickets({
          pendientes: raw.pendientes || [],
          reabiertos: raw.reabiertos || [],
          infoextra:  raw.infoextra  || [],
        });
      } catch (e) {
        console.warn('[ShugoHub] Tickets fetch:', e.message);
      }
    }
    loadTickets();
    const id = setInterval(loadTickets, window.POLL_TICKETS_MS);
    return () => clearInterval(id);
  }, []);

  // Tickets asignados a agentes: poll every 30s
  useEffect(() => {
    async function loadAssigned() {
      try {
        const r = await fetch(window.API_ASSIGNED);
        if (!r.ok) throw new Error(r.status);
        const raw = await r.json();
        setAgents(raw.agentes || []);
      } catch (e) {
        console.warn('[ShugoHub] Assigned tickets fetch:', e.message);
      }
    }
    loadAssigned();
    const id = setInterval(loadAssigned, window.POLL_ASSIGNED_MS);
    return () => clearInterval(id);
  }, []);

  const lastCycle = lastCycleStr || (lastFetch
    ? `${window.pad2(lastFetch.getHours())}:${window.pad2(lastFetch.getMinutes())}:${window.pad2(lastFetch.getSeconds())}`
    : '…');

  const station = useMemo(
    () => window.RADIO_STATIONS.find(s => s.url === t.stationUrl) || window.RADIO_STATIONS[0],
    [t.stationUrl]
  );

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol / 100; }, [vol]);
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.src = station.url;
    if (playing) audioRef.current.play().catch(() => setPlaying(false));
  }, [station.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      writeLocalStorage('shugohub_radio_playing', '0');
    } else {
      audioRef.current.play()
        .then(() => { setPlaying(true); writeLocalStorage('shugohub_radio_playing', '1'); })
        .catch(() => setPlaying(false));
    }
  };

  useEffect(() => { document.body.classList.toggle("dense", !!t.dense); }, [t.dense]);

  // Stage scale-to-fill (independent X/Y so no black bars)
  useEffect(() => {
    const onResize = () => {
      const stage = document.querySelector(".stage");
      if (!stage) return;
      stage.style.transform = `scale(${window.innerWidth / 1920}, ${window.innerHeight / 1080})`;
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="stage-wrap">
      <audio ref={audioRef} preload="none" crossOrigin="anonymous"></audio>
      <div className="stage">
        <window.TopBar station={station} onStation={(s) => { writeLocalStorage('shugohub_radio_station', s.url); setTweak("stationUrl", s.url); }}
          playing={playing} onTogglePlay={togglePlay} vol={vol} onVol={setVol} temp={temp} />

        <window.Kpis vms={vms} clocks={clocks} lastCycle={lastCycle} fichadas={fichadas} />

        <div className="main" style={{
          "--split-left":  `${t.splitPct}fr`,
          "--split-right": `${100 - t.splitPct}fr`,
        }}>
          {/* SERVIDORES */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><span className="accent-bar"></span>Servidores · ShugoVision</div>
              <div className="panel-meta">
                <span><b className="mono">{vms.length}</b> totales</span>
                <span><b className="mono" style={{ color: "var(--ok)" }}>{vms.filter(v => v.status !== "offline").length}</b> online</span>
                <span><b className="mono" style={{ color: "var(--warn)" }}>{vms.filter(v => v.status === "warn").length}</b> warn</span>
                <a className="panel-link" href={t.shugoVisionUrl} target="_blank" rel="noopener noreferrer">
                  Abrir <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8l4-4M4.5 3.5H8.5V7.5"/></svg>
                </a>
              </div>
            </div>
            <div className="panel-body">
              <div className="vm-list">{vms.map(v => <window.VMRow key={v.name} vm={v} />)}</div>
            </div>
          </div>

          <window.Splitter pct={t.splitPct} onChange={(v) => setTweak("splitPct", v)} />

          <div className="main-cols">
            {/* RELOJES */}
            <div className="panel" style={{ flex: t.splitPct2 }}>
              <div className="panel-head">
                <div className="panel-title" title="Relojes · ShugoTime"><span className="accent-bar"></span>Relojes</div>
                <div className="panel-meta">
                  <span title={`${clocks.filter(c => c.status !== "ok").length} con error`}>
                    <b className="mono" style={{ color: "var(--ok)" }}>{clocks.filter(c => c.status === "ok").length}</b>/<b className="mono">{clocks.length}</b>
                  </span>
                  <a className="panel-link" href={t.shugoTimeUrl} target="_blank" rel="noopener noreferrer" title="ShugoTime">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8l4-4M4.5 3.5H8.5V7.5"/></svg>
                  </a>
                </div>
              </div>
              <div className="panel-body" style={{ padding: "6px 8px" }}>
                <div className="clock-table">
                  <div className="clock-table-head">
                    <span></span><span>Reloj</span><span>Último ciclo</span>
                  </div>
                  <div className="clock-table-body">
                    {[...clocks].sort((a, b) => (a.status === "ok") - (b.status === "ok")).map(c => <window.ClockRow key={c.name} c={c} />)}
                  </div>
                </div>
              </div>
            </div>

            <window.Splitter pct={t.splitPct2} onChange={(v) => setTweak("splitPct2", v)} />

            <div className="main-right" style={{ flex: 100 - t.splitPct2 }}>
              {/* TICKETS */}
              <div className="panel tickets-panel">
                <div className="panel-head">
                  <div className="panel-title" title="Tickets · Mesa de ayuda"><span className="accent-bar"></span>Tickets</div>
                  <div className="panel-meta">
                    <a className="panel-link" href="#" onClick={(e) => { e.preventDefault(); setTicketsModalTab("pendientes"); }}>
                      Abrir <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8l4-4M4.5 3.5H8.5V7.5"/></svg>
                    </a>
                  </div>
                </div>
                <div className="panel-body">
                  <window.TicketsPanel tickets={tickets} onOpen={setTicketsModalTab} />
                </div>
              </div>

              {/* AGENTES / CÁMARA */}
              <div className="panel agents-panel">
                <div className="panel-head">
                  <div className="panel-title" title="Agentes · Tickets asignados">
                    <span className="accent-bar"></span>{agentsExpanded ? "Agentes" : "Cámara"}
                  </div>
                  <div className="panel-meta">
                    {agentsExpanded && <span><b className="mono">{agents.length}</b></span>}
                    <button className="panel-link" onClick={() => setAgentsExpanded((v) => !v)}>
                      {agentsExpanded ? "Ver cámara" : "Ver agentes"}
                    </button>
                  </div>
                </div>
                <div className="panel-body">
                  {agentsExpanded ? (
                    <window.AgentsPanel agents={agents} onOpen={(ag) => {
                      const first = window.AGENT_CATS.find((c) => ag.counts[c.key] > 0);
                      setAgentModal({ ...ag, initialTab: first ? first.key : "asignados" });
                    }} />
                  ) : (
                    <window.CameraFeed src={window.API_CAM_HLS} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {ticketsModalTab && (
          <window.CategoryTicketsModal title="Tickets · Mesa de ayuda" cats={window.TICKET_CATS} data={tickets}
            initialTab={ticketsModalTab} onClose={() => setTicketsModalTab(null)} />
        )}

        {agentModal && (
          <window.CategoryTicketsModal title={`Tickets asignados · ${agentModal.nombre}`} cats={window.AGENT_CATS} data={agentModal.tickets}
            initialTab={agentModal.initialTab} onClose={() => setAgentModal(null)} />
        )}

        <div className="foot mono">
          <div>SHUGOHUB · DPOSS · Ushuaia, Tierra del Fuego</div>
          <div className="right">
            <span className="cycle"><span className="cycle-tick"></span> VMs cada 30s · relojes cada 60s · tickets/agentes cada 30s</span>
            <span>auto-refresh activo</span>
            <span>v2.0</span>
          </div>
        </div>
      </div>

      {/* Tweaks panel (activable desde design tool) */}
      {React.createElement(TweaksPanel_UI)}
    </div>
  );
}

function TweaksPanel_UI() {
  const [t, setTweak] = window.useTweaks({
    "dense": false, "stationUrl": "https://ice2.somafm.com/groovesalad-128-mp3",
    "shugoVisionUrl": "http://shugovision.dposs.gob.ar",
    "shugoTimeUrl":   "http://relojes.dposs.gob.ar",
    "splitPct": 37, "splitPct2": 45,
  });
  const { TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakText, TweakSelect } = window;
  if (!TweaksPanel) return null;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Accesos">
        <TweakText label="ShugoVision URL" value={t.shugoVisionUrl} onChange={(v) => setTweak("shugoVisionUrl", v)} />
        <TweakText label="ShugoTime URL"   value={t.shugoTimeUrl}   onChange={(v) => setTweak("shugoTimeUrl", v)} />
      </TweakSection>
      <TweakSection title="Layout">
        <TweakSlider label="División servidores/resto" value={t.splitPct}  onChange={(v) => setTweak("splitPct", v)}  min={20} max={80} step={1} unit="%" />
        <TweakSlider label="División relojes/tickets"  value={t.splitPct2} onChange={(v) => setTweak("splitPct2", v)} min={20} max={80} step={1} unit="%" />
        <TweakToggle label="Modo denso" value={t.dense} onChange={(v) => setTweak("dense", v)} />
      </TweakSection>
      <TweakSection title="Radio">
        <TweakSelect label="Estación" value={t.stationUrl} onChange={(v) => setTweak("stationUrl", v)}
          options={window.RADIO_STATIONS.map(s => ({ label: s.name, value: s.url }))} />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><App /></ErrorBoundary>);
