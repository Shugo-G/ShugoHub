// ── Panel Tickets · Mesa de ayuda + modal de detalle (compartido con Agentes) ──
const { useState, useEffect } = React;

const TICKET_CATS = [
  { key: "pendientes", cls: "pend", badge: "PEND", tab: "Pendientes" },
  { key: "reabiertos", cls: "reab", badge: "REAB", tab: "Reabiertos" },
  { key: "infoextra",  cls: "info", badge: "INFO", tab: "Info. extra" },
];

function fmtTicketDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${window.pad2(d.getDate())}/${window.pad2(d.getMonth() + 1)} ${window.pad2(d.getHours())}:${window.pad2(d.getMinutes())}`;
}

function TicketsPanel({ tickets, onOpen }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), window.TICKET_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="tix-rows">
      {TICKET_CATS.map((cat) => {
        const list = tickets[cat.key] || [];
        const item = list.length ? list[tick % list.length] : null;
        return (
          <div key={cat.key} className={"tix-row " + cat.cls} onClick={() => onOpen(cat.key)}>
            <div className="tix-badge">
              <span className="num mono">{list.length}</span>
              <span className="lbl">{cat.badge}</span>
            </div>
            {item ? (
              <div className="tix-body">
                <div className="tix-title" key={"t" + item.id}>{item.title}</div>
                <div className="tix-meta" key={"m" + item.id}>{item.area || "General"} · {fmtTicketDate(item.date)}</div>
              </div>
            ) : (
              <div className="tix-empty-row">Sin tickets</div>
            )}
            <svg className="tix-arrow" width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg>
          </div>
        );
      })}
    </div>
  );
}

function CategoryTicketsModal({ title, cats, data, initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab || cats[0].key);
  const list = data[tab] || [];
  const cat = cats.find((c) => c.key === tab);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tix-modal-overlay" onClick={onClose}>
      <div className="tix-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tix-modal-head">
          <div className="tix-modal-title"><span className="accent-bar"></span>{title}</div>
          <button className="tix-close" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l8 8M10 2l-8 8"/></svg>
          </button>
        </div>
        <div className="tix-tabs">
          {cats.map((c) => (
            <button key={c.key} className={"tix-tab " + c.cls + (tab === c.key ? " active" : "")} onClick={() => setTab(c.key)}>
              {c.tab} <span className="badge mono">{(data[c.key] || []).length}</span>
            </button>
          ))}
        </div>
        <div className="tix-list">
          {list.length === 0 && <div className="tix-empty-list">No hay tickets en esta categoría.</div>}
          {list.map((tk) => (
            <div key={tk.id} className={"tix-card " + cat.cls}>
              <div className="tix-card-top">
                <span className="tix-card-date mono">#{tk.id} · {fmtTicketDate(tk.date)}</span>
                <span className="tix-card-area">{tk.area || "General"}</span>
              </div>
              <div className="tix-card-title">{tk.title}</div>
              <div className="tix-card-msg">{tk.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TICKET_CATS, fmtTicketDate, TicketsPanel, CategoryTicketsModal });
