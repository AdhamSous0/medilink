import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/api";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const session = getSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
    return { user: { id: session.id, email: session.email } };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
