// ── Panel Relojes · ShugoTime: fila de reloj biométrico ──

function ClockRow({ c }) {
  const cls = c.status === "ok" ? "" : c.status === "stale" ? "stale" : "err";
  return (
    <div className={"clock-row " + cls}>
      <span className="dot"></span>
      <div className="name">{c.name}</div>
      <div className="last mono">{c.last}</div>
    </div>
  );
}

Object.assign(window, { ClockRow });
