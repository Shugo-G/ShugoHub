// ── Divisor arrastrable entre dos columnas del layout ──
const { useState, useRef } = React;

function Splitter({ pct, onChange }) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);
  const onDown = (e) => {
    e.preventDefault();
    setDragging(true);
    const main = ref.current && ref.current.parentElement;
    if (!main) return;
    const move = (ev) => {
      const rect = main.getBoundingClientRect();
      const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      let p = Math.max(20, Math.min(80, Math.round((x / rect.width) * 100)));
      onChange(p);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div ref={ref} className={"split-handle " + (dragging ? "dragging" : "")}
      onMouseDown={onDown} title="Arrastrar para redimensionar">
      <div className="grip"><i></i><i></i><i></i></div>
    </div>
  );
}

Object.assign(window, { Splitter });
