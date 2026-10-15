import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { checkinEvent } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_app/checkin/$eventId")({ component: Checkin });

function Checkin() {
  const { eventId } = Route.useParams();
  const [state, setState] = useState<"pending" | "ok" | "err">("pending");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    checkinEvent({ data: { eventId, method: "QR" } })
      .then((r) => {
        setState("ok");
        setMsg(r.title);
      })
      .catch((e) => {
        setState("err");
        setMsg(errorMessage(e));
      });
  }, [eventId]);

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      {state === "pending" ? <p className="text-muted">Đang điểm danh…</p> : null}
      {state === "ok" ? (
        <>
          <p className="kicker">Thành công</p>
          <h1 className="mt-2 font-display text-4xl">Đã điểm danh</h1>
          <p className="mt-2 text-muted">{msg}</p>
        </>
      ) : null}
      {state === "err" ? (
        <>
          <h1 className="font-display text-3xl">Chưa điểm danh được</h1>
          <p className="mt-2 text-accent">{msg}</p>
        </>
      ) : null}
      <Link to="/attendance" className="mt-6 inline-block underline">Về trang điểm danh</Link>
    </div>
  );
}
