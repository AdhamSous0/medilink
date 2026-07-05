import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/lab-dashboard")({
  head: () => ({ meta: [{ title: "Lab Dashboard — MediLink" }] }),
  component: LabDashboardPage,
});

interface LabRequest {
  id: string;
  referral_id: string;
  test_type: string;
  notes: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  patient_name: string;
  reason: string;
  requested_by_name: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground",
  in_progress: "bg-primary-soft text-primary",
  completed: "bg-success/15 text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function LabDashboardPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<LabRequest[] | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [findings, setFindings] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await api.getLabRequests();
    setRequests((data as LabRequest[]) ?? []);
  }

  async function submitResult(id: string) {
    const text = findings[id]?.trim();
    if (!text) return;
    setSubmitting(id);
    await api.updateLabRequest(id, { findings: text, status: "completed" });
    toast.success(t("resultSubmitted"));
    setFindings((prev) => ({ ...prev, [id]: "" }));
    setSubmitting(null);
    load();
  }

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const completed = requests?.filter((r) => r.status === "completed") ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("labWorkspace")}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{t("labDashboard")}</h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("pendingRequests")}</span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-warning/15">
              <Clock className="h-4 w-4 text-warning-foreground" />
            </div>
          </div>
          <div className="text-2xl font-bold">{requests === null ? "—" : pending.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("completedRequests")}</span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-success/15">
              <CheckCircle2 className="h-4 w-4 text-success-foreground" />
            </div>
          </div>
          <div className="text-2xl font-bold">{requests === null ? "—" : completed.length}</div>
        </div>
      </div>

      {/* Requests list */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">{t("labRequests")}</h2>
        </div>

        {requests === null ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon={FlaskConical} title={t("noLabRequests")} />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((req) => (
              <li key={req.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[13px]">{req.patient_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[req.status] ?? "bg-muted text-muted-foreground"}`}>
                        {req.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("testType")}: {req.test_type}</p>
                    {req.notes && <p className="text-xs text-muted-foreground">{req.notes}</p>}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={findings[req.id] ?? ""}
                      onChange={(e) => setFindings((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder={t("findings")}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => submitResult(req.id)}
                      disabled={!findings[req.id]?.trim() || submitting === req.id}
                      className="self-end"
                    >
                      {submitting === req.id && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
                      {t("submitResult")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
