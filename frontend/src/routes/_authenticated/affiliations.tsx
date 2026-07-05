import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2, Stethoscope, Calendar, Clock, Plus, Trash2,
  XCircle, ChevronDown, ChevronUp, Loader2, UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/affiliations")({
  head: () => ({ meta: [{ title: "الارتباطات — MediLink" }] }),
  component: AffiliationsPage,
});

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type ScheduleSlot = { id: string; day_of_week: number; start_time: string; end_time: string; notes?: string };
type Affiliation = Record<string, any> & { schedule: ScheduleSlot[] };

const AVAILABILITY_META: Record<string, { label: string; dot: string; color: string }> = {
  available:    { label: "متاح",     dot: "bg-emerald-500", color: "text-emerald-600" },
  limited:      { label: "محدود",    dot: "bg-amber-500",   color: "text-amber-600" },
  busy:         { label: "مشغول",    dot: "bg-orange-500",  color: "text-orange-600" },
  on_leave:     { label: "في إجازة", dot: "bg-blue-500",    color: "text-blue-600" },
  unavailable:  { label: "غير متاح", dot: "bg-rose-500",    color: "text-rose-600" },
  offline:      { label: "غير متصل", dot: "bg-gray-400",    color: "text-gray-500" },
};

function ScheduleManager({
  affiliation,
  isCenter,
  onSlotAdded,
  onSlotDeleted,
}: {
  affiliation: Affiliation;
  isCenter: boolean;
  onSlotAdded: (invId: string, slot: ScheduleSlot) => void;
  onSlotDeleted: (invId: string, slotId: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ day_of_week: 0, start_time: "08:00", end_time: "16:00", notes: "" });
  const [saving, setSaving] = useState(false);

  async function addSlot() {
    setSaving(true);
    const { data, error } = await api.addScheduleSlot(affiliation.invitation_id, {
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (error) { toast.error("فشل إضافة الموعد"); return; }
    const slot: ScheduleSlot = {
      id: (data as any).id,
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes || undefined,
    };
    onSlotAdded(affiliation.invitation_id, slot);
    setShowAdd(false);
    setForm({ day_of_week: 0, start_time: "08:00", end_time: "16:00", notes: "" });
    toast.success("تم إضافة موعد العمل وإشعار الطبيب");
  }

  async function deleteSlot(slotId: string) {
    await api.deleteScheduleSlot(slotId);
    onSlotDeleted(affiliation.invitation_id, slotId);
    toast.success("تم حذف الموعد");
  }

  const slots = affiliation.schedule ?? [];

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">جدول العمل</p>
        {isCenter && (
          <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="h-3 w-3 mr-1" /> إضافة وردية
          </Button>
        )}
      </div>

      {slots.length === 0 && !showAdd && (
        <p className="text-[12px] text-muted-foreground">لم يُضَف جدول عمل بعد.</p>
      )}

      {slots.length > 0 && (
        <div className="space-y-1.5">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3 rounded-lg bg-surface border border-border px-3 py-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-[12px] font-medium w-16 shrink-0">{DAYS_AR[slot.day_of_week]}</span>
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground" dir="ltr">
                {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
              </span>
              {slot.notes && <span className="text-[11px] text-muted-foreground flex-1 truncate">{slot.notes}</span>}
              {isCenter && (
                <button onClick={() => deleteSlot(slot.id)} className="mr-auto text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">اليوم</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm((f) => ({ ...f, day_of_week: +e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {DAYS_AR.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">ملاحظة (اختياري)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="مثال: عيادة الطوارئ"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">من</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">إلى</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addSlot} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              حفظ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>إلغاء</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AffiliationCard({
  affiliation,
  isCenter,
  onCancel,
  onSlotAdded,
  onSlotDeleted,
  navigate,
}: {
  affiliation: Affiliation;
  isCenter: boolean;
  onCancel: (invId: string) => void;
  onSlotAdded: (invId: string, slot: ScheduleSlot) => void;
  onSlotDeleted: (invId: string, slotId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const name = isCenter
    ? (affiliation.doctor_name ?? affiliation.doctor_email)
    : (affiliation.center_name ?? affiliation.center_email);
  const sub = isCenter
    ? (affiliation.specialty ?? "")
    : (affiliation.city ?? "");
  const entityId = isCenter ? affiliation.doctor_id : affiliation.center_id;
  const avMeta = AVAILABILITY_META[affiliation.availability_status ?? "offline"] ?? AVAILABILITY_META["offline"];

  async function cancel() {
    setCancelling(true);
    const { error } = await api.cancelAffiliation(affiliation.invitation_id);
    setCancelling(false);
    if (error) { toast.error("فشل إنهاء الارتباط"); return; }
    toast.success("تم إنهاء الارتباط وإشعار الطرف الآخر");
    onCancel(affiliation.invitation_id);
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white
              ${isCenter ? "bg-primary" : "bg-accent"}`}>
              {isCenter ? <Stethoscope className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <button
                className="text-[14px] font-semibold hover:underline text-foreground text-right"
                onClick={() => navigate({ to: "/directory/$id", params: { id: entityId } })}
              >
                {name}
              </button>
              {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${avMeta.dot}`} />
                <span className={`text-[11px] ${avMeta.color}`}>{avMeta.label}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              الجدول
            </button>
            <button
              onClick={cancel}
              disabled={cancelling}
              className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[12px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              {cancelling
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <XCircle className="h-3.5 w-3.5" />}
              إنهاء الارتباط
            </button>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          مرتبط منذ {new Date(affiliation.since).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {expanded && (
        <div className="border-t border-border bg-surface px-5 pb-5 pt-4">
          <ScheduleManager
            affiliation={affiliation}
            isCenter={isCenter}
            onSlotAdded={onSlotAdded}
            onSlotDeleted={onSlotDeleted}
          />
        </div>
      )}
    </div>
  );
}

function AffiliationsPage() {
  const { user, role } = useCurrentUser();
  const navigate = useNavigate();
  const [affiliations, setAffiliations] = useState<Affiliation[] | null>(null);

  async function load() {
    if (!user) return;
    const { data } = await api.getAffiliations();
    setAffiliations((data as Affiliation[] | null) ?? []);
  }

  useEffect(() => { void load(); }, [user?.id]);

  function handleCancel(invId: string) {
    setAffiliations((prev) => prev?.filter((a) => a.invitation_id !== invId) ?? null);
  }

  function handleSlotAdded(invId: string, slot: ScheduleSlot) {
    setAffiliations((prev) =>
      prev?.map((a) => a.invitation_id === invId
        ? { ...a, schedule: [...(a.schedule ?? []), slot] }
        : a) ?? null
    );
  }

  function handleSlotDeleted(invId: string, slotId: string) {
    setAffiliations((prev) =>
      prev?.map((a) => a.invitation_id === invId
        ? { ...a, schedule: a.schedule.filter((s) => s.id !== slotId) }
        : a) ?? null
    );
  }

  const isCenter = role === "medical_center" || role === "laboratory";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">الارتباطات</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isCenter
            ? "الأطباء المرتبطون بمركزك وجداول عملهم"
            : "المراكز الطبية التي ترتبط بها وجدول عملك في كل مركز"}
        </p>
      </div>

      {affiliations === null ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : affiliations.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="لا توجد ارتباطات"
          description={isCenter
            ? "ادعُ أطباء للانضمام إلى مركزك من الدليل الطبي"
            : "ستظهر هنا المراكز التي تقبل دعواتها"}
        />
      ) : (
        <div className="space-y-4">
          {affiliations.map((aff) => (
            <AffiliationCard
              key={aff.invitation_id}
              affiliation={aff}
              isCenter={isCenter}
              onCancel={handleCancel}
              onSlotAdded={handleSlotAdded}
              onSlotDeleted={handleSlotDeleted}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
