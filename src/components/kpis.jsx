// ── Franja de KPIs (VMs y relojes) ──

function Kpis({ vms, clocks, lastCycle, fichadas }) {
  const onlineVms  = vms.filter(v => v.status !== "offline").length;
  const warnVms    = vms.filter(v => v.status === "warn").length;
  const critVms    = vms.filter(v => v.status === "crit").length;
  const offlineVms = vms.filter(v => v.status === "offline").length;
  const okClocks   = clocks.filter(c => c.status === "ok").length;
  const errClocks  = clocks.filter(c => c.status !== "ok").length;

  const items = [
    { label: "VMs ONLINE",   val: `${onlineVms}/${vms.length}`, tone: "ok",   hint: "Servidores" },
    { label: "VMs WARN",     val: warnVms,    tone: warnVms    ? "warn" : "muted", hint: "Servidores" },
    { label: "VMs CRIT",     val: critVms,    tone: critVms    ? "crit" : "muted", hint: "Servidores" },
    { label: "Offline",      val: offlineVms, tone: offlineVms ? "crit" : "muted", hint: "Servidores" },
    { label: "Relojes OK",   val: `${okClocks}/${clocks.length}`, tone: "ok", hint: "Relojes" },
    { label: "Con error",    val: errClocks,  tone: errClocks  ? "crit" : "muted", hint: "Relojes" },
    { label: "Último ciclo", val: lastCycle, tone: "info",   hint: "Relojes", small: true },
    { label: "Fichadas",     val: fichadas,  tone: "muted",  hint: "Último ciclo" },
  ];

  return (
    <div className="kpis">
      {items.map((k, i) => (
        <div key={i} className={"kpi " + k.tone}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-hint">{k.hint}</div>
          <div className="kpi-row">
            <div className="kpi-val mono" style={k.small ? { fontSize: 20 } : null}>{k.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Kpis });
