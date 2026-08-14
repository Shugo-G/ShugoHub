// ── Panel Agentes · Tickets asignados ──

const AGENT_CATS = [
  { key: "asignados", cls: "asig", badge: "ASIG", tab: "Asignados" },
  { key: "enproceso", cls: "proc", badge: "PROC", tab: "En proceso" },
  { key: "mejoras",   cls: "mejo", badge: "MEJ",  tab: "Mejoras" },
];

function AgentsPanel({ agents, onOpen }) {
  if (!agents.length) return <div className="agent-empty">Sin tickets asignados</div>;
  return (
    <div className="agents-list">
      {agents.map((ag) => (
        <div key={ag.idadm} className="agent-row" onClick={() => onOpen(ag)}>
          <div className="agent-badge">
            <span className="num mono">{ag.total}</span>
            <span className="lbl">TICK.</span>
          </div>
          <div className="agent-body">
            <div className="agent-name">{ag.nombre}</div>
            <div className="agent-breakdown">
              <span><b className="mono">{ag.counts.asignados}</b> asig</span>
              <span><b className="mono">{ag.counts.enproceso}</b> proc</span>
              <span><b className="mono">{ag.counts.mejoras}</b> mej</span>
            </div>
          </div>
          <svg className="tix-arrow" width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { AGENT_CATS, AgentsPanel });
