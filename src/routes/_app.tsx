import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/app-shell";
import { BootScreen } from "@/components/boot-screen";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  if (typeof window !== "undefined" && !isPending && !user) {
    const path = window.location.pathname;
    if (path.startsWith("/checkin/")) sessionStorage.setItem("nigoto_next", path);
  }
  if (isPending) return <BootScreen />;
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <AppShell>
          <Outlet />
        </AppShell>
      </SignedIn>
    </>
  );
}
