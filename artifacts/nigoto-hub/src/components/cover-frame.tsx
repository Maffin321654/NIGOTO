import { useRef } from "react";
import { cn } from "@/lib/utils";

export function coverPosition(raw: string | null | undefined) {
  const m = /^(\d{1,3})%\s+(\d{1,3})%$/.exec((raw || "").trim());
  if (!m) return "50% 50%";
  const n = (s: string) => Math.max(0, Math.min(100, Math.round(Number(s))));
  return `${n(m[1])}% ${n(m[2])}%`;
}

export function CoverFrame({
  src,
  position,
  onChange,
  className,
}: {
  src: string;
  position: string;
  onChange?: (next: string) => void;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pos = coverPosition(position);
  const [px, py] = pos.split(" ").map((p) => Number(p.replace("%", "")));

  function move(clientX: number, clientY: number) {
    const start = drag.current;
    const el = box.current;
    if (!start || !el || !onChange) return;
    const rect = el.getBoundingClientRect();
    const dx = ((clientX - start.x) / Math.max(rect.width, 1)) * 100;
    const dy = ((clientY - start.y) / Math.max(rect.height, 1)) * 100;
    const nx = Math.max(0, Math.min(100, Math.round(start.px - dx)));
    const ny = Math.max(0, Math.min(100, Math.round(start.py - dy)));
    onChange(`${nx}% ${ny}%`);
  }

  return (
    <div className={cn("md:col-span-2", className)}>
      <div
        ref={box}
        className={cn("relative overflow-hidden rounded-3xl bg-paper-2", onChange && "cursor-grab touch-none")}
        onPointerDown={onChange ? (e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px, py };
        } : undefined}
        onPointerMove={onChange ? (e) => { if (e.buttons) move(e.clientX, e.clientY); } : undefined}
        onPointerUp={() => { drag.current = null; }}
      >
        <img src={src} alt="" draggable={false} className="h-48 w-full object-cover sm:h-56" style={{ objectPosition: pos }} />
      </div>
      {onChange ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Kéo ảnh để chọn phần được hiện.</span>
          {([["50% 0%", "Trên"], ["50% 50%", "Giữa"], ["50% 100%", "Dưới"]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => onChange(value)} className={cn("rounded-full border border-line px-3 py-1 text-xs", pos === value && "bg-ink text-paper-3")}>{label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
