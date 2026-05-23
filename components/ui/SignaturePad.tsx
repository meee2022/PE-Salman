"use client";

import { useRef, useState, useEffect } from "react";
import { Eraser, Check } from "lucide-react";

// لوح توقيع — يدعم اللمس والفأرة، يُصدّر dataURL
export function SignaturePad({ label, value, onSave }: {
  label: string;
  value?: string;
  onSave: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // ضبط دقّة عالية
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1C1008";
  }, []);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    drawing.current = true; setDirty(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function up() { drawing.current = false; }
  function clear() {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height); setDirty(false); onSave(null);
  }
  function save() {
    if (!dirty) return;
    onSave(canvasRef.current!.toDataURL("image/png"));
  }

  // إن كان هناك توقيع محفوظ، اعرضه كصورة
  if (value) {
    return (
      <div>
        <p className="text-sm font-semibold text-[#1C1008] mb-1.5">{label}</p>
        <div className="border border-gold/20 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-inner">
          <img src={value} alt={label} className="max-h-24" />
        </div>
        <button onClick={clear} className="no-print mt-2 text-xs text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 transition-colors"><Eraser size={12} /> مسح وإعادة التوقيع</button>
      </div>
    );
  }

  return (
    <div className="no-print">
      <p className="text-sm font-semibold text-[#1C1008] mb-1.5">{label}</p>
      <canvas ref={canvasRef}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="w-full h-28 border-2 border-dashed border-[#DFC48E]/40 rounded-2xl bg-[#FCFAF2] touch-none cursor-crosshair shadow-inner" />
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={!dirty} className="btn-primary !py-1.5 !px-3.5 text-xs disabled:opacity-40"><Check size={13} /> حفظ التوقيع</button>
        <button onClick={clear} className="btn-ghost !py-1.5 !px-3.5 text-xs hover:bg-black/[0.03] transition-colors"><Eraser size={13} /> مسح</button>
      </div>
    </div>
  );
}
