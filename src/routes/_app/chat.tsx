import { createFileRoute, Link } from "@tanstack/react-router";
import { Paperclip, Smile, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAT_EMOJI, CHAT_REACT, LIMITS } from "@/lib/constants";
import { clearChat, deleteChat, getChatFile, getMe, listChat, reactChat, sendChat } from "@/lib/server/fns";
import { cn, compressImage, errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_app/chat")({ component: ChatPage });

type Msg = Awaited<ReturnType<typeof listChat>>["messages"][number];

function ChatPage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reply, setReply] = useState<Msg | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [file, setFile] = useState<{ name: string; mime: string; dataUrl: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const pull = useCallback(async () => {
    const r = await listChat({ data: {} });
    setMutedUntil(r.mutedUntil);
    setMeId(r.meId);
    setCanModerate(r.canModerate);
    setMessages(r.messages);
  }, []);

  useEffect(() => {
    getMe().then((m) => setMeId(m.userId)).catch(() => {});
    let live = true;
    pull().catch((e) => {
      if (live) setErr(errorMessage(e));
    });
    const t = window.setInterval(() => {
      pull().catch(() => {});
    }, 2500);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [pull]);

  useEffect(() => {
    if (!stick.current) return;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  useEffect(() => {
    const tick = () => {
      if (!mutedUntil) {
        setLeft(0);
        return;
      }
      const s = Math.ceil((new Date(mutedUntil).getTime() - Date.now()) / 1000);
      setLeft(s > 0 ? s : 0);
      if (s <= 0) setMutedUntil(null);
    };
    tick();
    const t = window.setInterval(tick, 250);
    return () => window.clearInterval(t);
  }, [mutedUntil]);

  async function onPick(f: File | undefined) {
    if (!f) return;
    if (f.size > LIMITS.chatFile) {
      toast.error("Ảnh/tệp tối đa 2MB.");
      return;
    }
    try {
      if (f.type.startsWith("image/")) {
        const dataUrl = await compressImage(f, 900, 0.72);
        if (Math.floor((dataUrl.length * 3) / 4) > LIMITS.chatFile) {
          toast.error("Ảnh sau khi nén vẫn quá 2MB.");
          return;
        }
        setFile({ name: f.name, mime: "image/jpeg", dataUrl });
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ""));
          r.onerror = () => reject(new Error("Không đọc được tệp."));
          r.readAsDataURL(f);
        });
        setFile({ name: f.name, mime: f.type || "application/octet-stream", dataUrl });
      }
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !file) || busy || left > 0) return;
    setBusy(true);
    try {
      await sendChat({
        data: {
          body,
          replyTo: reply?.id,
          attachment: file ?? undefined,
        },
      });
      setText("");
      setReply(null);
      setFile(null);
      setEmojiOpen(false);
      await pull();
    } catch (er) {
      toast.error(errorMessage(er));
      await pull();
    } finally {
      setBusy(false);
    }
  }

  async function onReact(id: string, emoji: string) {
    try {
      await reactChat({ data: { messageId: id, emoji } });
      await pull();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  async function downloadFile(id: string) {
    try {
      const f = await getChatFile({ data: { messageId: id } });
      const a = document.createElement("a");
      a.href = f.url;
      a.download = f.name;
      a.rel = "noreferrer";
      a.click();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Xóa tin nhắn này?")) return;
    try {
      await deleteChat({ data: { messageId: id } });
      if (reply?.id === id) setReply(null);
      await pull();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  async function onClear() {
    if (!confirm("Xóa toàn bộ khung chat? Không hoàn tác được.")) return;
    try {
      await clearChat();
      setReply(null);
      await pull();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  async function openImage(m: Msg) {
    const preview = m.attachment?.preview;
    if (preview) {
      setLightbox({ src: preview, name: m.attachment?.name || "ảnh" });
      return;
    }
    try {
      const f = await getChatFile({ data: { messageId: m.id } });
      setLightbox({ src: f.url, name: f.name });
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Câu lạc bộ"
        title="Chat chung"
        desc="Trả lời, emoji, ảnh/tệp tối đa 2MB. Từ cấm sẽ timeout 30 giây."
        action={canModerate ? <Button variant="danger" onClick={() => void onClear()}>Xóa toàn bộ</Button> : undefined}
      />
      {err ? <p className="mb-3 text-accent">{err}</p> : null}
      <div className="card-paper flex h-[min(72vh,680px)] flex-col overflow-hidden">
        <div
          ref={scroller}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Chưa có tin nhắn. Hãy mở lời chào.</p>
          ) : (
            messages.map((m) => {
              if (m.kind === "SYSTEM") {
                return (
                  <div key={m.id} className="px-4 text-center">
                    <p className="text-xs text-accent">{m.body}</p>
                    {canModerate ? (
                      <button type="button" className="mt-1 text-[11px] text-muted hover:text-accent" onClick={() => void onDelete(m.id)}>Xóa</button>
                    ) : null}
                  </div>
                );
              }
              const mine = m.userId === meId;
              return (
                <div key={m.id} className={cn("group max-w-[88%]", mine ? "ml-auto" : "")}>
                  <p className="mb-0.5 text-[11px] text-muted">
                    {m.userId ? (
                      <Link to="/members/$id" params={{ id: m.userId }} className="hover:underline">
                        {mine ? "Bạn" : m.name}
                      </Link>
                    ) : m.name}
                    <span className="ml-2 tabular-nums">
                      {new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </p>
                  {m.replyPreview ? (
                    <div className={cn("mb-1 rounded-xl border-l-2 border-gold px-2 py-1 text-xs text-muted", mine ? "bg-ink/80 text-paper-3/80" : "bg-paper")}>
                      <span className="font-semibold">{m.replyPreview.name}</span>
                      {m.replyPreview.body ? ` — ${m.replyPreview.body}` : " — tệp đính kèm"}
                    </div>
                  ) : null}
                  <div className={cn("rounded-2xl px-3 py-2 text-sm break-words [overflow-wrap:anywhere]", mine ? "bg-ink text-paper-3" : "bg-paper-2 text-ink")}>
                    {m.attachment?.preview ? (
                      <button type="button" className="mb-2 block w-full" onClick={() => void openImage(m)}>
                        <img src={m.attachment.preview} alt={m.attachment.name} className="max-h-56 w-full cursor-zoom-in rounded-xl object-cover" />
                      </button>
                    ) : m.attachment ? (
                      <button type="button" className="mb-2 block text-left text-sm underline" onClick={() => void downloadFile(m.id)}>
                        📎 {m.attachment.name}
                      </button>
                    ) : null}
                    {m.body}
                  </div>
                  {m.reactions.length ? (
                    <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "")}>
                      {m.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => onReact(m.id, r.emoji)}
                          className={cn("rounded-full border px-2 py-0.5 text-xs", r.mine ? "border-gold bg-gold/20" : "border-line bg-paper-3")}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className={cn("mt-1 flex flex-wrap items-center gap-1 text-[11px]", mine ? "justify-end" : "")}>
                    <button type="button" className="text-muted hover:text-ink" onClick={() => setReply(m)}>Trả lời</button>
                    {canModerate ? (
                      <button type="button" className="text-accent hover:underline" onClick={() => void onDelete(m.id)}>Xóa</button>
                    ) : null}
                    {CHAT_REACT.map((e) => (
                      <button key={e} type="button" className="opacity-70 hover:opacity-100" onClick={() => onReact(m.id, e)} aria-label={`React ${e}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {left > 0 ? (
          <p className="border-t border-line bg-accent/10 px-4 py-2 text-center text-sm text-accent">
            Timeout còn {left}s — tin nhắn có từ cấm không được gửi.
          </p>
        ) : null}
        {reply ? (
          <div className="flex items-center justify-between border-t border-line bg-paper-2 px-3 py-2 text-xs">
            <p className="min-w-0 truncate text-muted">
              Đang trả lời <span className="font-semibold text-ink">{reply.userId === meId ? "chính bạn" : reply.name}</span>
              {reply.body ? ` — ${reply.body}` : ""}
            </p>
            <button type="button" className="ml-2 shrink-0" onClick={() => setReply(null)} aria-label="Hủy trả lời"><X className="size-4" /></button>
          </div>
        ) : null}
        {file ? (
          <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs">
            <p className="truncate text-muted">Đính kèm: {file.name}</p>
            <button type="button" onClick={() => setFile(null)} aria-label="Gỡ tệp"><X className="size-4" /></button>
          </div>
        ) : null}
        {emojiOpen ? (
          <div className="grid grid-cols-10 gap-1 border-t border-line bg-paper-3 p-2">
            {CHAT_EMOJI.map((e) => (
              <button key={e} type="button" className="grid h-9 place-items-center rounded-lg text-lg hover:bg-paper-2" onClick={() => { setText((t) => (t + e).slice(0, LIMITS.chat)); }}>
                {e}
              </button>
            ))}
          </div>
        ) : null}
        <form onSubmit={onSend} className="flex items-center gap-2 border-t border-line p-3">
          <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={(e) => { void onPick(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full border border-line" disabled={left > 0} onClick={() => fileRef.current?.click()} aria-label="Đính kèm">
            <Paperclip className="size-4" />
          </button>
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full border border-line" disabled={left > 0} onClick={() => setEmojiOpen((v) => !v)} aria-label="Emoji">
            <Smile className="size-4" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={LIMITS.chat}
            disabled={left > 0}
            placeholder={left > 0 ? `Chờ ${left}s…` : "Nhắn với cả câu lạc bộ…"}
          />
          <Button type="submit" disabled={busy || left > 0 || (!text.trim() && !file)}>Gửi</Button>
        </form>
      </div>
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Xem ảnh"
        >
          <button type="button" className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-paper-3 text-ink" onClick={() => setLightbox(null)} aria-label="Đóng">
            <X className="size-5" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.name}
            className="max-h-[92vh] max-w-[min(96vw,1100px)] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
