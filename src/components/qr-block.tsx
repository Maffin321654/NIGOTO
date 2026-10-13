import { useEffect, useState } from "react";

export function QrBlock({ value, label }: { value: string; label?: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let live = true;
    import("qrcode").then((QR) =>
      QR.toDataURL(value, { width: 280, margin: 1, color: { dark: "#1b3a4b", light: "#fffdf8" } }).then((url) => {
        if (live) setSrc(url);
      }),
    );
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <div className="flex flex-col items-center gap-2">
      {src ? <img src={src} alt="Mã QR điểm danh" className="h-52 w-52 rounded-2xl border border-line bg-paper-3 p-2" /> : <div className="h-52 w-52 rounded-2xl bg-paper-2" />}
      {label ? <p className="text-xs text-muted">{label}</p> : null}
    </div>
  );
}
