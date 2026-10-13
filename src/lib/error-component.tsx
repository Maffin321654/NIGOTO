import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

const STALE_CHUNK =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

const RELOAD_KEY = "nigoto_chunk_reload";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const message = error?.message || "Đã có lỗi. Hãy tải lại trang.";
  const stale = STALE_CHUNK.test(message);

  useEffect(() => {
    if (!stale || typeof window === "undefined") return;
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  }, [stale]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6 text-center">
      <div>
        <p className="font-display text-2xl text-ink">Nigoto Hub</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          {stale
            ? "Trang đang dùng bản cũ sau khi xuất bản. Đang tải lại…"
            : message}
        </p>
        <button
          className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper-3"
          onClick={() => {
            try {
              sessionStorage.removeItem(RELOAD_KEY);
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
        >
          Tải lại
        </button>
      </div>
    </main>
  );
}
