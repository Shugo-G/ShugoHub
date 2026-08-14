// ── Barra superior: marca, reloj en vivo, temperatura y reproductor de radio ──

function TopBar({ station, onStation, playing, onTogglePlay, vol, onVol, temp }) {
  const now = window.useClock();
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div className="brand-text">
          <div className="brand-name">SHUGO<span className="brand-dot">·</span>HUB</div>
          <div className="brand-sub">Operations Overview</div>
        </div>
      </div>
      <div className="clock-block">
        <div>
          <span className="clock-time mono">{window.fmtTime(now)}</span>
          <span className="clock-secs mono">:{window.fmtSec(now)}</span>
        </div>
        <div className="clock-date mono">{window.fmtDate(now)}</div>
        {temp !== null && <>
          <span className="clock-div"></span>
          <div className="clock-temp mono">
            <svg width="16" height="30" viewBox="0 0 14 28" fill="none" style={{opacity: 0.75}}>
              <rect x="5" y="1" width="4" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="7" cy="23" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="6.25" y="11" width="1.5" height="10" rx="0.75" fill="currentColor"/>
              <circle cx="7" cy="23" r="2.8" fill="currentColor"/>
            </svg>
            {temp}°C
          </div>
        </>}
      </div>
      <div className="topbar-right">
        <div className="live-pill"><span className="live-dot"></span> En vivo</div>
        <RadioCard station={station} onStation={onStation} playing={playing} onTogglePlay={onTogglePlay} vol={vol} onVol={onVol} />
      </div>
    </div>
  );
}

function RadioCard({ station, onStation, playing, onTogglePlay, vol, onVol }) {
  return (
    <div className="radio" title="Radio">
      <button className={"radio-btn " + (playing ? "playing" : "")} onClick={onTogglePlay} aria-label={playing ? "Pausar" : "Reproducir"}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="3" height="8" fill="currentColor"/><rect x="7" y="2" width="3" height="8" fill="currentColor"/></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="3,2 10,6 3,10" fill="currentColor"/></svg>}
      </button>
      <div className="radio-meta">
        <div className="radio-name">
          <select className="radio-station-select" value={station.url}
            onChange={(e) => { const s = window.RADIO_STATIONS.find(x => x.url === e.target.value); if (s) onStation(s); }}
            style={{ color: "var(--ink)", fontSize: 12, fontWeight: 600 }}>
            {window.RADIO_STATIONS.map(s => <option key={s.url} value={s.url}>{s.name}</option>)}
          </select>
        </div>
        <div className="radio-genre">
          {station.genre}
          {playing && <span className="radio-eq"><span/><span/><span/><span/></span>}
        </div>
      </div>
      <div className="radio-vol">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: "var(--ink-3)" }}>
          <path d="M2 4.5h2l3-2.5v8L4 7.5H2z" fill="currentColor"/>
          <path d="M8.5 4c.6.6.6 3.4 0 4"/>
        </svg>
        <input type="range" min="0" max="100" value={vol} onChange={(e) => onVol(Number(e.target.value))} />
      </div>
    </div>
  );
}

Object.assign(window, { TopBar, RadioCard });
