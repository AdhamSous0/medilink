import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRightLeft, Calendar, CheckCircle2,
  FileText, Loader2, Paperclip, Stethoscope, Upload, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScheduleAppointmentDialog } from "@/components/schedule-appointment-dialog";
import { UploadReportDialog } from "@/components/upload-report-dialog";
import { RedirectReferralDialog } from "@/components/redirect-referral-dialog";
import { ReferralMessages } from "@/components/referral-messages";
import { ActivityTimeline } from "@/components/activity-timeline";
import { statusClasses, urgencyClasses, type Referral } from "@/lib/referrals";

export const Route = createFileRoute("/_authenticated/referrals/$id")({
  head: () => ({ meta: [{ title: "Referral — MediLink" }] }),
  component: ReferralDetailPage,
});

type FullReferral = Referral & {
  doctor: { full_name: string | null; email: string | null; phone: string | null } | null;
  center: { organization_name: string | null; address: string | null } | null;
};
type Appointment = { id: string; scheduled_at: string; duration_minutes: number; location: string | null; notes: string | null };
type Report = { id: string; title: string; summary: string | null; storage_path: string | null; mime_type: string | null; created_at: string };
type Attachment = { id: string; label: string | null; storage_path: string; mime_type: string | null; uploaded_by: string; created_at: string };

function ReferralDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useCurrentUser();
  const { t } = useI18n();

  const [referral, setReferral] = useState<FullReferral | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [redirectOpen, setRedirectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: r }, { data: a }, { data: rep }, { data: att }] = await Promise.all([
      api.getReferral(id), api.getAppointments(id), api.getReports(id), api.getAttachments(id),
    ]);
    setReferral((r as unknown as FullReferral) ?? null);
    setAppointments((a as Appointment[] | null) ?? []);
    setReports((rep as Report[] | null) ?? []);
    setAttachments((att as Attachment[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  async function setStatus(status: Referral["status"], rejection_reason?: string) {
    if (!referral) return;
    const { error } = await api.updateReferral(referral.id, { status, rejection_reason: rejection_reason ?? null });
    if (error) return toast.error(error.message);
    const statusLabel: Record<string, string> = {
      accepted: t("statusAccepted"), rejected: t("statusRejected"),
      scheduled: t("statusScheduled"), in_progress: t("statusInProgress"),
      completed: t("statusCompleted"), cancelled: t("statusCancelled"),
      redirected: t("statusRedirected"),
    };
    toast.success(`${t("markedAs")} ${statusLabel[status] ?? status}`);
    void load();
  }

  if (loading) return (
    <div className="grid place-items-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!referral) return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: "/referrals" })}>
        {t("backToReferrals")}
      </Button>
    </div>
  );

  const isCenter = role === "medical_center" && user?.id === referral.center_id;
  const isDoctor = role === "doctor" && user?.id === referral.doctor_id;

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"), accepted: t("statusAccepted"), rejected: t("statusRejected"),
    scheduled: t("statusScheduled"), in_progress: t("statusInProgress"), completed: t("statusCompleted"),
    cancelled: t("statusCancelled"), expired: t("statusExpired"), redirected: t("statusRedirected"),
  };
  const urgencyLabel: Record<string, string> = {
    routine: t("urgencyRoutine"), urgent: t("urgencyUrgent"), emergency: t("urgencyEmergency"),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/referrals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("backToReferrals")}
      </Link>

      <header className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{referral.patient_name}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusClasses(referral.status)}`}>
                {statusLabel[referral.status] ?? referral.status}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${urgencyClasses(referral.urgency)}`}>
                {urgencyLabel[referral.urgency] ?? referral.urgency}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {referral.specialty_needed ?? t("general")} · {new Date(referral.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isCenter && referral.status === "pending" && (
              <>
                <Button onClick={() => setStatus("accepted")}><CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("accept")}</Button>
                <Button variant="outline" onClick={() => setShowReject((v) => !v)}><XCircle className="mr-1.5 h-4 w-4" /> {t("reject")}</Button>
              </>
            )}
            {isCenter && (referral.status === "accepted" || referral.status === "pending") && (
              <Button variant="outline" onClick={() => setScheduleOpen(true)}><Calendar className="mr-1.5 h-4 w-4" /> {t("schedule")}</Button>
            )}
            {isCenter && (referral.status === "scheduled" || referral.status === "in_progress") && (
              <Button variant="outline" onClick={() => setStatus("in_progress")}>{t("markInProgress")}</Button>
            )}
            {isCenter && referral.status !== "completed" && referral.status !== "rejected" && (
              <Button onClick={() => setReportOpen(true)}><Upload className="mr-1.5 h-4 w-4" /> {t("uploadReport")}</Button>
            )}
            {isCenter && !["completed", "cancelled", "rejected", "redirected"].includes(referral.status) && (
              <Button variant="outline" onClick={() => setRedirectOpen(true)}><ArrowRightLeft className="mr-1.5 h-4 w-4" /> {t("redirect")}</Button>
            )}
            {isDoctor && referral.status === "pending" && (
              <Button variant="outline" onClick={() => setStatus("cancelled")}>{t("cancelReferral")}</Button>
            )}
          </div>
        </div>

        {showReject && isCenter && (
          <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface p-4">
            <Textarea placeholder={t("rejectionReasonLabel")} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowReject(false)}>{t("cancel")}</Button>
              <Button variant="destructive" onClick={() => { setStatus("rejected", rejectReason || undefined); setShowReject(false); }}>
                {t("confirmRejection")}
              </Button>
            </div>
          </div>
        )}

        {referral.rejection_reason && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <strong>{t("rejectionReason")}:</strong> {referral.rejection_reason}
          </div>
        )}
        {referral.status === "redirected" && referral.redirected_to_referral_id && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700">
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            <span>{t("redirectedNotice")}</span>
            <Link to="/referrals/$id" params={{ id: referral.redirected_to_referral_id }} className="ml-auto shrink-0 font-medium underline underline-offset-2">
              {t("viewNewReferral")}
            </Link>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section icon={Stethoscope} title={t("clinicalDetails")}>
            <DefItem label={t("reasonForReferral")}>{referral.reason}</DefItem>
            {referral.clinical_notes && <DefItem label={t("clinicalNotes")}>{referral.clinical_notes}</DefItem>}
          </Section>

          <Section icon={Calendar} title={t("appointments")}>
            {appointments.length === 0 ? (
              <EmptyLine text={t("noAppointments")} />
            ) : (
              <ul className="space-y-2">
                {appointments.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="font-medium">{new Date(a.scheduled_at).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.duration_minutes} min{a.location ? ` · ${a.location}` : ""}
                    </div>
                    {a.notes && <div className="mt-1 text-sm">{a.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={FileText} title={t("statReports")}>
            {reports.length === 0 ? <EmptyLine text={t("noReports")} /> : (
              <ul className="space-y-2">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="font-medium">{r.title}</div>
                    {r.summary && <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Paperclip} title={t("attachmentsSection")}>
            {attachments.length === 0 ? <EmptyLine text={t("noAttachments")} /> : (
              <ul className="space-y-2">
                {attachments.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="font-medium">{a.label ?? a.storage_path}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <ReferralMessages referralId={referral.id} />

          <ActivityTimeline referralId={referral.id} />
        </div>

        <aside className="space-y-6">
          <Section title={t("patientSection")}>
            <DefItem label={t("name")}>{referral.patient_name}</DefItem>
            {referral.patient_phone && <DefItem label={t("phone")}>{referral.patient_phone}</DefItem>}
            {referral.patient_dob && <DefItem label={t("dob")}>{new Date(referral.patient_dob).toLocaleDateString()}</DefItem>}
          </Section>
          <Section title={t("referringDoctor")}>
            <DefItem label={t("name")}>{referral.doctor?.full_name ?? "—"}</DefItem>
            <DefItem label={t("email")}>{referral.doctor?.email ?? "—"}</DefItem>
            {referral.doctor?.phone && <DefItem label={t("phone")}>{referral.doctor.phone}</DefItem>}
          </Section>
          <Section title={t("provider")}>
            <DefItem label={t("center")}>{referral.center?.organization_name ?? "—"}</DefItem>
            {referral.center?.address && <DefItem label={t("address")}>{referral.center.address}</DefItem>}
          </Section>
        </aside>
      </div>

      <ScheduleAppointmentDialog referralId={referral.id} open={scheduleOpen} onOpenChange={setScheduleOpen} onScheduled={load} />
      <UploadReportDialog referralId={referral.id} open={reportOpen} onOpenChange={setReportOpen} onUploaded={load} markCompleted />
      <RedirectReferralDialog referralId={referral.id} currentCenterId={referral.center_id ?? ""} open={redirectOpen} onOpenChange={setRedirectOpen} onRedirected={(newId) => navigate({ to: "/referrals/$id", params: { id: newId } })} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon?: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </h2>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function DefItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm">{children}</div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
