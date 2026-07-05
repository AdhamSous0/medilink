import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { CreateReferralDialog } from "@/components/create-referral-dialog";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({ meta: [{ title: "Patients — MediLink" }] }),
  component: PatientsPage,
});

type Patient = {
  key: string; name: string; phone: string | null;
  dob: string | null; referralCount: number; lastReferralAt: string;
};

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary-soft text-primary",
  "bg-accent-soft text-accent-foreground",
  "bg-warning/15 text-warning-foreground",
  "bg-destructive/10 text-destructive",
  "bg-success/15 text-success-foreground",
];

function PatientsPage() {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[] | null>(null);

  async function load() {
    if (!user) return;
    const { data } = await api.getReferrals();
    const referrals = (data as any[] | null) ?? [];
    const map = new Map<string, Patient>();
    referrals.forEach((r: any) => {
      const key = `${r.patient_name}|${r.patient_phone ?? ""}`;
      const existing = map.get(key);
      if (existing) { existing.referralCount += 1; }
      else { map.set(key, { key, name: r.patient_name ?? "—", phone: r.patient_phone, dob: r.patient_dob, referralCount: 1, lastReferralAt: r.created_at }); }
    });
    setPatients(Array.from(map.values()));
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("patients")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("patientsDesc")}</p>
        </div>
        <CreateReferralDialog onCreated={load} />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {patients === null ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-3 w-24 shrink-0" />
              </li>
            ))}
          </ul>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noPatientsYet")}
            description={t("patientsDesc")}
            action={<CreateReferralDialog onCreated={load} />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {patients.map((p, i) => (
              <li key={p.key} className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface sm:px-6">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`text-[11px] font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {getInitials(p.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.phone ?? t("noPhone")}
                    {p.dob ? ` · ${t("dob")} ${new Date(p.dob).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {p.referralCount} {p.referralCount !== 1 ? t("referralsPlural") : t("referral")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t("last")} {new Date(p.lastReferralAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
