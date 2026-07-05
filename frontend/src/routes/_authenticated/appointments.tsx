import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin } from "lucide-react";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({ meta: [{ title: "Appointments — MediLink" }] }),
  component: AppointmentsPage,
});

type Row = {
  id: string; referral_id: string; scheduled_at: string;
  duration_minutes: number; location: string | null; notes: string | null;
  patient_name: string | null; specialty_needed: string | null;
  center_organization_name: string | null; doctor_full_name: string | null;
};

function AppointmentsPage() {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getAppointments().then(({ data, error }) => {
      if (error) console.error(error);
      setRows((data as Row[] | null) ?? []);
    });
  }, [user?.id]);

  const upcoming = rows?.filter((r) => new Date(r.scheduled_at).getTime() >= Date.now()) ?? [];
  const past = rows?.filter((r) => new Date(r.scheduled_at).getTime() < Date.now()) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("appointments")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("upcomingPast")}</p>
      </div>

      {rows === null ? (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-start gap-5 px-4 py-4 sm:px-6">
                <div className="w-14 shrink-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <EmptyState icon={Calendar} title={t("noAppointmentsYet")} description={t("upcomingPast")} />
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Section title={t("upcoming")} badge={upcoming.length}>
              {upcoming.map((r) => <AppointmentRow key={r.id} row={r} upcoming t={t} />)}
            </Section>
          )}
          {past.length > 0 && (
            <Section title={t("past")} muted>
              {past.map((r) => <AppointmentRow key={r.id} row={r} t={t} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, badge, muted, children }: {
  title: string; badge?: number; muted?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {title}
        </h2>
        {badge !== undefined && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground leading-none">
            {badge}
          </span>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <ul className="divide-y divide-border">
          {children}
        </ul>
      </div>
    </div>
  );
}

function AppointmentRow({ row: r, upcoming, t }: { row: Row; upcoming?: boolean; t: (k: any) => string }) {
  const d = new Date(r.scheduled_at);
  return (
    <li>
      <Link to="/referrals/$id" params={{ id: r.referral_id }} className="group flex items-start gap-5 px-4 py-4 transition-colors hover:bg-surface sm:px-6">
        {/* Date column */}
        <div className={`w-14 shrink-0 text-center rounded-lg py-2 px-1 ${upcoming ? "bg-primary-soft" : "bg-muted/50"}`}>
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${upcoming ? "text-primary" : "text-muted-foreground"}`}>
            {d.toLocaleDateString(undefined, { month: "short" })}
          </div>
          <div className={`text-xl font-bold leading-none ${upcoming ? "text-primary" : "text-muted-foreground"}`}>
            {d.getDate()}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold">{r.patient_name ?? "—"}</span>
            {r.specialty_needed && (
              <span className="text-[11px] text-muted-foreground">· {r.specialty_needed}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {r.duration_minutes} min
            </span>
            {r.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {r.location}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {r.center_organization_name ?? "—"}
            {r.doctor_full_name ? ` · Dr. ${r.doctor_full_name}` : ""}
          </div>
        </div>
      </Link>
    </li>
  );
}
