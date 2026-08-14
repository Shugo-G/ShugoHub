// ── Panel Servidores · ShugoVision: fila de VM con barras de CPU/RAM/Disco ──

function VMMetric({ label, value }) {
  const tone = value > 80 ? "crit" : value > 50 ? "warn" : "ok";
  return (
    <div className="vm-metric">
      <span className="lbl">{label}</span>
      <span className="bar"><span className={tone} style={{ width: `${Math.min(100, value)}%` }}></span></span>
      <span className="val mono">{(+value).toFixed(1)}</span>
    </div>
  );
}

function fmtAgo(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(mins) || mins < 0) return null;
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

function VMRow({ vm }) {
  const isOffline = vm.status === "offline";
  const ago = fmtAgo(vm.lastSeen);
  return (
    <div className={"vm-row " + (isOffline ? "offline" : "")}>
      <span className="dot"></span>
      <div className="vm-row-id">
        <div className="vm-row-name">{vm.name}</div>
        <div className="vm-row-ip mono">{vm.ip}</div>
      </div>
      {isOffline ? (
        <div className="vm-row-offline-msg">Offline{ago ? ` · Sin respuesta hace ${ago}` : " · Sin conexión"}</div>
      ) : (
        <div className="vm-row-metrics">
          <VMMetric label="c" value={vm.cpu} />
          <VMMetric label="r" value={vm.ram} />
          <VMMetric label="d" value={vm.disk} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { VMMetric, VMRow });
