import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { CreateReferralDialog } from "@/components/create-referral-dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MediLink" }] }),
  component: DashboardPage,
});

type StatCard = {
  labelKey: TranslationKey;
  value: string | number;
  hintKey: TranslationKey;
  icon: typeof Users;
  color: string;
  bg: string;
};
type Activity = { id: string; patient_name: string; status: string; created_at: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/80",
  accepted: "bg-primary/80",
  scheduled: "bg-accent/80",
  in_progress: "bg-primary",
  completed: "bg-success",
  rejected: "bg-destructive/80",
  cancelled: "bg-muted-foreground/60",
  redirected: "bg-accent",
  expired: "bg-muted-foreground/40",
};

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
          <Skeleton className="h-2 w-2 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const { user, profile, role } = useCurrentUser();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatCard[] | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !role) return;
    void loadDashboard(role).then(({ stats: s, activity: a }) => {
      setStats(s);
      setActivity(a);
      setLoaded(true);
    });
  }, [user?.id, role]);

  if (!role) return null;

  const greeting = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "";

  const subheading: Record<AppRole, TranslationKey> = {
    doctor: "snapshotToday",
    medical_center: "incomingGlance",
    patient: "careJourney",
    laboratory: "labDashboard",
    admin: "adminPanel",
  };

  const emptyHintKey: Record<AppRole, TranslationKey> = {
    doctor: "noReferralsDoctor",
    medical_center: "noReferralsCenter",
    patient: "noReferralsPatient",
    laboratory: "noLabRequests",
    admin: "noUsers",
  };

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"), accepted: t("statusAccepted"), rejected: t("statusRejected"),
    scheduled: t("statusScheduled"), in_progress: t("statusInProgress"), completed: t("statusCompleted"),
    cancelled: t("statusCancelled"), expired: t("statusExpired"), redirected: t("statusRedirected"),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("welcomeBack")}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {t("hi")} {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(subheading[role])}</p>
        </div>
        {role === "doctor" && <CreateReferralDialog />}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!loaded
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : (stats ?? []).map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground leading-snug">
                      {t(s.labelKey)}
                    </span>
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-bold tracking-tight tabular-nums">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t(s.hintKey)}</div>
                </div>
              );
            })}
      </div>

      {/* Activity + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">{t("recentActivity")}</h2>
            <button
              onClick={() => navigate({ to: "/referrals" })}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              {t("viewAll")} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {!loaded ? (
            <ActivitySkeleton />
          ) : activity === null || activity.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t(emptyHintKey[role])}
              description={role === "doctor" ? t("noReferralsDoctorDesc" as any) ?? undefined : undefined}
              action={role === "doctor" ? <CreateReferralDialog /> : undefined}
            />
          ) : (
            <ul className="space-y-1.5">
              {activity.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => navigate({ to: "/referrals/$id", params: { id: r.id } })}
                    className="group flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[r.status] ?? "bg-muted"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[13px]">{r.patient_name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {statusLabel[r.status] ?? r.status.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">{t("quickActions")}</h2>
          <div className="space-y-1.5">
            {quickActionsFor(role).map((a) => (
              <button
                key={a.labelKey}
                onClick={() => navigate({ to: a.to as "/" })}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <a.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[13px] font-medium">{t(a.labelKey as TranslationKey)}</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function loadDashboard(role: AppRole) {
  const { data: allReferrals } = await api.getReferrals();
  const referrals = (allReferrals as Activity[] | null) ?? [];
  const OPEN = ["pending", "accepted", "scheduled", "in_progress"];

  if (role === "doctor") {
    const uniquePatients = new Set(referrals.map((r: any) => `${r.patient_name}|${r.patient_phone ?? ""}`)).size;
    const open = referrals.filter((r: any) => OPEN.includes(r.status)).length;
    const completed = referrals.filter((r: any) => r.status === "completed").length;
    const stats: StatCard[] = [
      { labelKey: "statPatients", value: uniquePatients, hintKey: "acrossAllReferrals", icon: Users, color: "text-primary", bg: "bg-primary-soft" },
      { labelKey: "statOpenReferrals", value: open, hintKey: "inFlight", icon: FileText, color: "text-warning-foreground", bg: "bg-warning/15" },
      { labelKey: "statAwaitingReports", value: open, hintKey: "fromCenters", icon: Clock, color: "text-accent-foreground", bg: "bg-accent-soft" },
      { labelKey: "statCompleted", value: completed, hintKey: "total", icon: CheckCircle2, color: "text-success-foreground", bg: "bg-success/15" },
    ];
    return { stats, activity: referrals.slice(0, 6) };
  }

  if (role === "medical_center") {
    const incoming = referrals.filter((r: any) => r.status === "pending").length;
    const accepted = referrals.filter((r: any) => r.status === "accepted").length;
    const stats: StatCard[] = [
      { labelKey: "statIncoming", value: incoming, hintKey: "newReferrals", icon: FileText, color: "text-warning-foreground", bg: "bg-warning/15" },
      { labelKey: "statAccepted", value: accepted, hintKey: "awaitingScheduling", icon: CheckCircle2, color: "text-primary", bg: "bg-primary-soft" },
      { labelKey: "statTotal", value: referrals.length, hintKey: "allReferrals", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
      { labelKey: "statCompleted", value: referrals.filter((r: any) => r.status === "completed").length, hintKey: "done", icon: ArrowUpRight, color: "text-success-foreground", bg: "bg-success/15" },
    ];
    return { stats, activity: referrals.slice(0, 6) };
  }

  if (role === "laboratory") {
    const { data: labData } = await api.getLabRequests();
    const labRequests = (labData as any[] | null) ?? [];
    const pending = labRequests.filter((r: any) => r.status === "pending").length;
    const completed = labRequests.filter((r: any) => r.status === "completed").length;
    const stats: StatCard[] = [
      { labelKey: "pendingRequests", value: pending, hintKey: "inProgress", icon: FlaskConical, color: "text-warning-foreground", bg: "bg-warning/15" },
      { labelKey: "completedRequests", value: completed, hintKey: "done", icon: CheckCircle2, color: "text-success-foreground", bg: "bg-success/15" },
      { labelKey: "statTotal", value: labRequests.length, hintKey: "allReferrals", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
      { labelKey: "labResults", value: completed, hintKey: "available", icon: FileText, color: "text-primary", bg: "bg-primary-soft" },
    ];
    return { stats, activity: [] };
  }

  if (role === "admin") {
    const { data: adminData } = await api.getAdminStats();
    const s = (adminData as any) ?? {};
    const stats: StatCard[] = [
      { labelKey: "totalUsers", value: s.totalUsers ?? 0, hintKey: "acrossAllReferrals", icon: Users, color: "text-primary", bg: "bg-primary-soft" },
      { labelKey: "totalDoctors", value: s.totalDoctors ?? 0, hintKey: "inYourCare", icon: Stethoscope, color: "text-accent-foreground", bg: "bg-accent-soft" },
      { labelKey: "totalCenters", value: s.totalCenters ?? 0, hintKey: "awaitingScheduling", icon: Building2, color: "text-warning-foreground", bg: "bg-warning/15" },
      { labelKey: "totalReferrals", value: s.totalReferrals ?? 0, hintKey: "allReferrals", icon: ShieldCheck, color: "text-success-foreground", bg: "bg-success/15" },
    ];
    return { stats, activity: [] };
  }

  const active = referrals.filter((r: any) => OPEN.includes(r.status)).length;
  const stats: StatCard[] = [
    { labelKey: "statActiveReferrals", value: active, hintKey: "inProgress", icon: FileText, color: "text-primary", bg: "bg-primary-soft" },
    { labelKey: "statUpcoming", value: 0, hintKey: "appointments", icon: Clock, color: "text-accent-foreground", bg: "bg-accent-soft" },
    { labelKey: "statReports", value: 0, hintKey: "available", icon: CheckCircle2, color: "text-success-foreground", bg: "bg-success/15" },
    { labelKey: "statDoctors", value: "—", hintKey: "inYourCare", icon: Stethoscope, color: "text-muted-foreground", bg: "bg-muted" },
  ];
  return { stats, activity: referrals.slice(0, 6) };
}

function quickActionsFor(role: AppRole) {
  if (role === "doctor") return [
    { labelKey: "viewReferrals", icon: FileText, to: "/referrals" },
    { labelKey: "viewPatients", icon: Users, to: "/patients" },
    { labelKey: "notifications", icon: Stethoscope, to: "/notifications" },
  ];
  if (role === "medical_center") return [
    { labelKey: "reviewIncoming", icon: FileText, to: "/referrals" },
    { labelKey: "viewAppointments", icon: Building2, to: "/appointments" },
    { labelKey: "notifications", icon: ArrowUpRight, to: "/notifications" },
  ];
  if (role === "laboratory") return [
    { labelKey: "labRequests", icon: FlaskConical, to: "/lab-dashboard" },
    { labelKey: "notifications", icon: UserRound, to: "/notifications" },
    { labelKey: "settings", icon: CheckCircle2, to: "/settings" },
  ];
  if (role === "admin") return [
    { labelKey: "allUsers", icon: ShieldCheck, to: "/admin" },
    { labelKey: "notifications", icon: UserRound, to: "/notifications" },
    { labelKey: "settings", icon: CheckCircle2, to: "/settings" },
  ];
  return [
    { labelKey: "myReferralsAction", icon: FileText, to: "/referrals" },
    { labelKey: "myAppointments", icon: Building2, to: "/appointments" },
    { labelKey: "notifications", icon: UserRound, to: "/notifications" },
  ];
}
