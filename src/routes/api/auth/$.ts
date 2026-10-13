import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { readSignupOpen } from "@/lib/server/core";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: async ({ request }) => {
        const path = new URL(request.url).pathname.toLowerCase();
        if (path.includes("sign-up")) {
          const sql = await getSql();
          const open = await readSignupOpen(sql);
          if (!open) {
            return Response.json(
              { message: "CLB đang không nhận thêm thành viên mới. Bạn vẫn đăng nhập được nếu đã có tài khoản." },
              { status: 403 },
            );
          }
        }
        return auth.handler(request);
      },
    },
  },
});
