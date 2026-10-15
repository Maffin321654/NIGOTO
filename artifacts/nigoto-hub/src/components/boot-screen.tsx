import { useEffect, useState } from "react";

export function BootScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6 text-center">
      <div>
        <p className="font-display text-2xl text-ink">Nigoto Hub</p>
        <p className="mt-2 text-sm text-muted">Đang mở workspace…</p>
        <a
          href={`/?r=${Date.now()}`}
          className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper-3"
        >
          Tải lại
        </a>
        {slow ? (
          <p className="mt-3 text-xs text-muted">
            Nếu vẫn không vào được: mở cửa sổ ẩn danh hoặc xóa cache trang này.
          </p>
        ) : null}
      </div>
    </div>
  );
}
