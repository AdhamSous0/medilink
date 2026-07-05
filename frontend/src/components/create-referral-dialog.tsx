import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Plus, Sparkles, AlertTriangle } from "lucide-react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Center = { id: string; organization_name: string | null; provider_type: string | null; address: string | null; availability_status?: string };

const AVAIL_COLOR: Record<string, string> = {
  available: "text-emerald-600", limited: "text-amber-600", busy: "text-orange-500",
  unavailable: "text-rose-500", full_capacity: "text-rose-500", closed: "text-rose-600",
};
const AVAIL_LABEL: Record<string, string> = {
  available: "متاح", limited: "محدود", busy: "مشغول",
  unavailable: "غير متاح", full_capacity: "مكتمل", closed: "مغلق",
};

export function CreateReferralDialog({ onCreated }: { onCreated?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [centers, setCenters] = useState<Center[]>([]);
  const [suggestions, setSuggestions] = useState<Center[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    center_id: "", patient_name: "", patient_phone: "", patient_dob: "",
    specialty_needed: "", urgency: "routine" as "routine" | "urgent" | "emergency",
    reason: "", clinical_notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setLoadingCenters(true);
    api.getCenters().then(({ data }) => {
      setCenters((data ?? []) as Center[]);
      setLoadingCenters(false);
    });
  }, [open]);

  useEffect(() => {
    if (!form.specialty_needed || form.specialty_needed.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      api.getSuggestions(form.specialty_needed).then(({ data }) => setSuggestions((data ?? []) as Center[]));
    }, 500);
    return () => clearTimeout(timer);
  }, [form.specialty_needed]);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm({ center_id: "", patient_name: "", patient_phone: "", patient_dob: "", specialty_needed: "", urgency: "routine", reason: "", clinical_notes: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.center_id || !form.patient_name || !form.reason) {
      toast.error(t("centerRequired")); return;
    }
    setSubmitting(true);
    const { error } = await api.createReferral({
      center_id: form.center_id,
      patient_name: form.patient_name,
      patient_phone: form.patient_phone || null,
      patient_dob: form.patient_dob || null,
      specialty_needed: form.specialty_needed || null,
      urgency: form.urgency.toUpperCase(),
      reason: form.reason,
      clinical_notes: form.clinical_notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("referralCreated"));
    setOpen(false);
    reset();
    onCreated?.();
  }

  const urgencyStyles: Record<string, string> = {
    routine: "border-success/50 bg-success/10 text-success-foreground",
    urgent: "border-warning/50 bg-warning/10 text-warning-foreground",
    emergency: "border-destructive/50 bg-destructive/10 text-destructive",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 text-sm font-semibold">
          <Plus className="h-3.5 w-3.5" />
          {t("newReferral")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{t("createReferralTitle")}</DialogTitle>
          <DialogDescription className="text-xs">{t("sendPatientTo")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary-soft p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                {t("suggestedCenters")}
              </div>
              <div className="space-y-1">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => update("center_id", s.id)}
                    className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm text-left transition-all
                      ${form.center_id === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}
                  >
                    <span className="font-medium">{s.organization_name}</span>
                    <span className={`text-[11px] ${form.center_id === s.id ? "text-primary-foreground/80" : (AVAIL_COLOR[s.availability_status ?? ""] ?? "text-muted-foreground")}`}>
                      {AVAIL_LABEL[s.availability_status ?? ""] ?? s.availability_status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Urgency warning for emergency */}
          {form.urgency === "emergency" && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>إحالة طارئة — ستظهر في أعلى قائمة المركز بشكل فوري</span>
            </div>
          )}

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("referTo")}</Label>
            <Select value={form.center_id} onValueChange={(v) => update("center_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCenters ? t("loadingCenters") : t("selectCenter")} />
              </SelectTrigger>
              <SelectContent>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.organization_name ?? t("noCenters")}</span>
                      {c.availability_status && (
                        <span className={`text-[10px] font-medium ${AVAIL_COLOR[c.availability_status] ?? "text-muted-foreground"}`}>
                          {AVAIL_LABEL[c.availability_status] ?? c.availability_status}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {centers.length === 0 && !loadingCenters && (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">{t("noCenters")}</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Patient info */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("patientSection")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pn" className="text-[13px]">{t("patientName")} *</Label>
                <Input id="pn" value={form.patient_name} onChange={(e) => update("patient_name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp" className="text-[13px]">{t("patientPhone")}</Label>
                <Input id="pp" value={form.patient_phone} onChange={(e) => update("patient_phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pdob" className="text-[13px]">{t("dateOfBirth")}</Label>
                <Input id="pdob" type="date" value={form.patient_dob} onChange={(e) => update("patient_dob", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp" className="text-[13px]">{t("specialtyNeeded")}</Label>
                <Input id="sp" placeholder={t("specialtyPlaceholder2")} value={form.specialty_needed} onChange={(e) => update("specialty_needed", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("urgency")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["routine", "urgent", "emergency"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => update("urgency", u)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-all ${
                    form.urgency === u
                      ? urgencyStyles[u]
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {u === "routine" ? t("urgencyRoutine") : u === "urgent" ? t("urgencyUrgent") : t("urgencyEmergency")}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical info */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-[13px]">{t("reasonForReferral")} *</Label>
              <Textarea id="reason" rows={3} value={form.reason} onChange={(e) => update("reason", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-[13px]">{t("clinicalNotes")}</Label>
              <Textarea id="notes" rows={2} placeholder={t("clinicalNotesPlaceholder")} value={form.clinical_notes} onChange={(e) => update("clinical_notes", e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>{t("cancel")}</Button>
            <Button type="submit" disabled={submitting} className="font-semibold">
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("sendReferral")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
