import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, FileText, Loader2, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — MediLink" }] }),
  component: AdminPage,
});

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  organization_name: string | null;
  specialty: string | null;
}

interface AdminStats {
  totalUsers: number;
  totalReferrals: number;
  totalDoctors: number;
  totalCenters: number;
}

const ROLE_ICON: Record<string, typeof Stethoscope> = {
  DOCTOR: Stethoscope,
  MEDICAL_CENTER: Building2,
  LAB_STAFF: ShieldCheck,
  ADMIN: ShieldCheck,
};

function AdminPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getAdminUsers().then(({ data }) => setUsers((data as AdminUser[]) ?? [])),
      api.getAdminStats().then(({ data }) => setStats(data ?? null)),
    ]);
  }, []);

  async function toggleUser(id: string, active: boolean) {
    setToggling(id);
    await api.updateAdminUser(id, { is_active: !active });
    toast.success(active ? t("userDeactivated") : t("userActivated"));
    setUsers((prev) => prev?.map((u) => u.id === id ? { ...u, is_active: !active } : u) ?? null);
    setToggling(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("adminWorkspace")}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{t("adminPanel")}</h1>
      </div>

      {/* System stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { labelKey: "totalUsers" as const, icon: Users, value: stats?.totalUsers, color: "text-primary", bg: "bg-primary-soft" },
          { labelKey: "totalDoctors" as const, icon: Stethoscope, value: stats?.totalDoctors, color: "text-accent-foreground", bg: "bg-accent-soft" },
          { labelKey: "totalCenters" as const, icon: Building2, value: stats?.totalCenters, color: "text-warning-foreground", bg: "bg-warning/15" },
          { labelKey: "totalReferrals" as const, icon: FileText, value: stats?.totalReferrals, color: "text-success-foreground", bg: "bg-success/15" },
        ].map((s) => (
          <div key={s.labelKey} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t(s.labelKey)}</span>
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <div className="mt-4 text-2xl font-bold tabular-nums">
              {stats === null ? <Skeleton className="h-7 w-12" /> : (s.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">{t("allUsers")}</h2>
        </div>

        {users === null ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title={t("noUsers")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("fullName")}</th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("email")}</th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("role")}</th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const Icon = ROLE_ICON[u.role] ?? Users;
                  return (
                    <tr key={u.id} className={`transition-colors hover:bg-surface ${!u.is_active ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                            {u.full_name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <span className="text-[13px] font-medium">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[12px]">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="capitalize">{u.role.toLowerCase().replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u.is_active ? "bg-success/15 text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUser(u.id, u.is_active)}
                          disabled={toggling === u.id}
                          className="text-[12px]"
                        >
                          {toggling === u.id && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
                          {u.is_active ? t("deactivate") : t("activate")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
