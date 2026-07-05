import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Building2,
  FileText,
  FlaskConical,
  Home,
  Languages,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { auth, api } from "@/lib/api";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchDialog } from "@/components/search-dialog";

type NavItem = { labelKey: string; to: string; icon: typeof Home };

const navByRole: Record<AppRole, NavItem[]> = {
  doctor: [
    { labelKey: "dashboard", to: "/dashboard", icon: Home },
    { labelKey: "patients", to: "/patients", icon: Users },
    { labelKey: "referrals", to: "/referrals", icon: FileText },
    { labelKey: "affiliations", to: "/affiliations", icon: UserCheck },
    { labelKey: "directory", to: "/directory", icon: Building2 },
    { labelKey: "notifications", to: "/notifications", icon: Bell },
    { labelKey: "settings", to: "/settings", icon: Settings },
  ],
  medical_center: [
    { labelKey: "dashboard", to: "/dashboard", icon: Home },
    { labelKey: "incomingReferrals", to: "/referrals", icon: FileText },
    { labelKey: "affiliations", to: "/affiliations", icon: UserCheck },
    { labelKey: "appointments", to: "/appointments", icon: Building2 },
    { labelKey: "directory", to: "/directory", icon: Users },
    { labelKey: "notifications", to: "/notifications", icon: Bell },
    { labelKey: "settings", to: "/settings", icon: Settings },
  ],
  patient: [
    { labelKey: "dashboard", to: "/dashboard", icon: Home },
    { labelKey: "myReferrals", to: "/referrals", icon: FileText },
    { labelKey: "appointments", to: "/appointments", icon: Building2 },
    { labelKey: "directory", to: "/directory", icon: Building2 },
    { labelKey: "notifications", to: "/notifications", icon: Bell },
    { labelKey: "settings", to: "/settings", icon: Settings },
  ],
  laboratory: [
    { labelKey: "labDashboard", to: "/lab-dashboard", icon: FlaskConical },
    { labelKey: "labRequests", to: "/lab-dashboard", icon: FileText },
    { labelKey: "directory", to: "/directory", icon: Building2 },
    { labelKey: "notifications", to: "/notifications", icon: Bell },
    { labelKey: "settings", to: "/settings", icon: Settings },
  ],
  admin: [
    { labelKey: "adminPanel", to: "/admin", icon: ShieldCheck },
    { labelKey: "allUsers", to: "/admin", icon: Users },
    { labelKey: "directory", to: "/directory", icon: Building2 },
    { labelKey: "notifications", to: "/notifications", icon: Bell },
    { labelKey: "settings", to: "/settings", icon: Settings },
  ],
};

const roleWorkspaceKey: Record<AppRole, string> = {
  doctor: "doctorWorkspace",
  medical_center: "providerWorkspace",
  patient: "patientWorkspace",
  laboratory: "labWorkspace",
  admin: "adminWorkspace",
};

const roleMeta: Record<AppRole, { icon: typeof Stethoscope; color: string }> = {
  doctor: { icon: Stethoscope, color: "text-primary" },
  medical_center: { icon: Building2, color: "text-accent" },
  patient: { icon: UserRound, color: "text-warning" },
  laboratory: { icon: FlaskConical, color: "text-success-foreground" },
  admin: { icon: ShieldCheck, color: "text-destructive" },
};

function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="px-3 py-3">
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/80 px-4 lg:px-8">
          <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
        </header>
        <main className="px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-3 w-80" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="h-64 rounded-xl lg:col-span-2" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, role, loading } = useCurrentUser();
  const { t, lang, setLang } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Cmd+K / Ctrl+K opens search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function refresh() {
      const { data } = await api.getUnreadCount();
      if (active && data) setUnread(data.count ?? 0);
    }
    void refresh();
    const interval = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.id]);

  async function handleSignOut() {
    await auth.signOut();
    toast.success(t("signedOut"));
    navigate({ to: "/auth", replace: true });
  }

  if (loading || !role) return <AppShellSkeleton />;

  const items = navByRole[role];
  const RoleIcon = roleMeta[role].icon;
  const roleColor = roleMeta[role].color;
  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const SidebarBody = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Activity className="h-4 w-4" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">MediLink</span>
      </div>

      {/* Role badge */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-xs">
          <RoleIcon className={`h-3.5 w-3.5 shrink-0 ${roleColor}`} />
          <span className="font-medium text-sidebar-foreground">{t(roleWorkspaceKey[role] as any)}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const isNotifications = item.to === "/notifications";
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                active
                  ? "bg-primary-soft text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
              )}
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"}`} />
              <span className="flex-1">{t(item.labelKey as any)}</span>
              {isNotifications && unread > 0 && (
                <span className="grid h-4.5 min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{lang === "ar" ? t("switchToEnglish") : t("switchToArabic")}</span>
        </button>

        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary-soft text-primary text-[11px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-sidebar-foreground">
              {profile?.full_name ?? user?.email}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title={t("signOut")}
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {SidebarBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar shadow-elevated">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{t("search")}</span>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[9px] font-mono ms-2">⌘K</kbd>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden h-8 w-8"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={() => navigate({ to: "/notifications" })}
            aria-label={t("notifications")}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Button>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
