// ── Helpers de formato de fecha/hora + hook de reloj en vivo ──
const { useState, useEffect } = React;

const pad2 = (n) => String(n).padStart(2, "0");
const fmtTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const fmtSec  = (d) => pad2(d.getSeconds());
const fmtDate = (d) => {
  const days   = ["DOM","LUN","MAR","MIE","JUE","VIE","SAB"];
  const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  return `${days[d.getDay()]} ${pad2(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t;
}

Object.assign(window, { pad2, fmtTime, fmtSec, fmtDate, useClock });
