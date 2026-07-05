import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { FileText, Search, SlidersHorizontal } from "lucide-react";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateReferralDialog } from "@/components/create-referral-dialog";
import {
  statusClasses,
  urgencyClasses,
  type Referral,
  type ReferralStatus,
} from "@/lib/referrals";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — MediLink" }] }),
  component: ReferralsPage,
});

type Row = Referral & {
  doctor: { full_name: string | null; email: string | null } | null;
  center: { organization_name: string | null } | null;
};

function RowSkeleton() {
  return (
    <li className="flex items-start gap-4 px-4 py-4 sm:px-6">
      <Skeleton className="mt-0.5 h-2 w-2 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-3 w-16 shrink-0" />
    </li>
  );
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-warning",
  accepted: "bg-primary",
  scheduled: "bg-accent",
  in_progress: "bg-primary",
  completed: "bg-success",
  rejected: "bg-destructive",
  cancelled: "bg-muted-foreground/50",
  redirected: "bg-accent",
  expired: "bg-muted-foreground/30",
};

function ReferralsPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <ReferralsList />;
}

function ReferralsList() {
  const { user, role } = useCurrentUser();
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | "all">("all");

  async function load() {
    if (!user) return;
    setRows(null);
    const { data, error } = await api.getReferrals();
    if (error) { console.error(error); setRows([]); return; }
    setRows((data as unknown as Row[]) ?? []);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id]);

  const filtered = useMemo(() => {
    if (!rows) return rows;
    const q = search.trim().toLowerCase();
    const result = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.patient_name ?? "").toLowerCase().includes(q) ||
        (r.specialty_needed ?? "").toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q)
      );
    });
    // Emergency referrals always on top
    return result.sort((a, b) => {
      if (a.urgency === "emergency" && b.urgency !== "emergency") return -1;
      if (b.urgency === "emergency" && a.urgency !== "emergency") return 1;
      if (a.urgency === "urgent" && b.urgency === "routine") return -1;
      if (b.urgency === "urgent" && a.urgency === "routine") return 1;
      return 0;
    });
  }, [rows, search, statusFilter]);

  const headingKey = role === "doctor" ? "referrals" : role === "medical_center" ? "incomingReferrals" : "myReferrals";
  const subKey = role === "doctor" ? "trackReferrals" : role === "medical_center" ? "reviewReferrals" : "referralsByDoctor";

  const statusKeys: Record<ReferralStatus, string> = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    rejected: t("statusRejected"),
    scheduled: t("statusScheduled"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
    expired: t("statusExpired"),
    redirected: t("statusRedirected"),
  };

  const totalCount = rows?.length ?? 0;
  const filteredCount = filtered?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t(headingKey as any)}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t(subKey as any)}</p>
        </div>
        {role === "doctor" && <CreateReferralDialog onCreated={load} />}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReferralStatus | "all")}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {(Object.keys(statusKeys) as ReferralStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusKeys[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rows !== null && (
          <span className="text-xs text-muted-foreground">
            {filtered !== null && statusFilter !== "all"
              ? `${filteredCount} / ${totalCount}`
              : totalCount}{" "}
            {t("referrals")}
          </span>
        )}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {filtered === null ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
          </ul>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("noReferralsYet")}
            description={search ? t("tryDifferentSearch" as any) ?? undefined : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.id} className="group">
                <Link
                  to="/referrals/$id"
                  params={{ id: r.id }}
                  className={`flex items-start gap-4 px-4 py-4 transition-colors hover:bg-surface sm:px-6
                    ${r.urgency === "emergency" ? "bg-destructive/5 border-l-2 border-destructive" : ""}`}
                >
                  {/* Status dot */}
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[r.status] ?? "bg-muted"}`} />

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Name + badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold">{r.patient_name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusClasses(r.status)}`}>
                        {statusKeys[r.status] ?? r.status}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${urgencyClasses(r.urgency)}`}>
                        {r.urgency === "routine" ? t("urgencyRoutine") : r.urgency === "urgent" ? t("urgencyUrgent") : t("urgencyEmergency")}
                      </span>
                    </div>
                    {/* Reason */}
                    <p className="line-clamp-1 text-[12px] text-muted-foreground">
                      {r.specialty_needed ? <><span className="font-medium text-foreground/70">{r.specialty_needed}</span> · </> : ""}
                      {r.reason}
                    </p>
                    {/* Doctor/Center */}
                    <p className="text-[11px] text-muted-foreground">
                      {role === "medical_center"
                        ? `${t("fromDr")} ${r.doctor?.full_name ?? r.doctor?.email ?? "—"}`
                        : `${t("to")} ${r.center?.organization_name ?? "—"}`}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
