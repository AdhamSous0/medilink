"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { referralApi } from "@/lib/api";
import { CreateReferralRequest, PractitionerSpecialty, UrgencyLevel } from "@/types/referral";

const URGENCY_OPTIONS: UrgencyLevel[] = ["ROUTINE", "URGENT", "EMERGENCY"];

const SPECIALTY_OPTIONS: PractitionerSpecialty[] = [
  "GENERAL_PRACTICE", "INTERNAL_MEDICINE", "CARDIOLOGY", "NEUROLOGY",
  "ORTHOPEDICS", "PEDIATRICS", "SURGERY", "OTHER",
];

export default function NewReferralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<CreateReferralRequest>>({
    urgency: "ROUTINE",
    send: false,
  });

  const set = <K extends keyof CreateReferralRequest>(k: K, v: CreateReferralRequest[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (send: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const referral = await referralApi.create({
        ...(form as CreateReferralRequest),
        send,
      });
      router.push(`/referrals/${referral.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">إحالة جديدة</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
        <Field label="معرّف المريض *">
          <input
            type="text"
            className="input"
            placeholder="UUID المريض"
            onChange={(e) => set("patientId", e.target.value)}
          />
        </Field>

        <Field label="الطبيب المستقبِل (اختياري)">
          <input
            type="text"
            className="input"
            placeholder="UUID الطبيب المستقبِل"
            onChange={(e) => set("receivingPractitionerId", e.target.value || undefined)}
          />
        </Field>

        <Field label="التخصص المطلوب (إذا لم يُحدد طبيب)">
          <select className="input" onChange={(e) => set("requestedSpecialty", e.target.value as PractitionerSpecialty || undefined)}>
            <option value="">— اختر تخصصاً —</option>
            {SPECIALTY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="مستوى الإلحاح *">
          <select className="input" value={form.urgency} onChange={(e) => set("urgency", e.target.value as UrgencyLevel)}>
            {URGENCY_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>

        <Field label="سبب الإحالة *">
          <textarea
            className="input min-h-[80px]"
            placeholder="وصف السبب السريري..."
            onChange={(e) => set("reason", e.target.value)}
          />
        </Field>

        <Field label="ملاحظات سريرية">
          <textarea
            className="input min-h-[80px]"
            placeholder="معلومات إضافية للطبيب المستقبِل..."
            onChange={(e) => set("clinicalNotes", e.target.value || undefined)}
          />
        </Field>

        <Field label="رمز التشخيص (ICD-10)">
          <input
            type="text"
            className="input"
            placeholder="مثال: J45.9"
            onChange={(e) => set("diagnosisCode", e.target.value || undefined)}
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            disabled={loading}
            onClick={() => handleSubmit(false)}
            className="btn btn-secondary flex-1"
          >
            حفظ مسودة
          </button>
          <button
            disabled={loading}
            onClick={() => handleSubmit(true)}
            className="btn btn-primary flex-1"
          >
            إرسال الإحالة
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
