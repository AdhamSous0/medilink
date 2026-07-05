"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "PRACTITIONER" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register(form);
      saveAuth({ token: res.token, email: res.email, fullName: res.fullName, role: res.role as never });
      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0f172a] p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">MediLink</span>
        </div>

        <div>
          <blockquote className="text-2xl font-light leading-relaxed text-slate-200">
            "منصة تنسيق الرعاية الصحية — ربط الأطباء والمرضى والمراكز الطبية في نظام واحد متكامل."
          </blockquote>
          <p className="mt-6 text-slate-400 text-sm">إحالات طبية · متابعة فورية · سجل طبي موحّد</p>
        </div>

        <div className="flex gap-6 text-slate-500 text-xs">
          <span>© 2026 MediLink</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">MediLink</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === "login" ? "أهلاً بعودتك" : "إنشاء حساب جديد"}
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            {mode === "login" ? "سجّل دخولك للوصول إلى لوحة التحكم" : "انضم إلى شبكة MediLink الطبية"}
          </p>

          {error && (
            <div className="mb-5 flex gap-2 items-start p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <Field label="الاسم الكامل">
                  <input type="text" required className="input" placeholder="د. أحمد محمد" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                </Field>
                <Field label="الدور">
                  <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
                    <option value="PRACTITIONER">طبيب / ممارس صحي</option>
                    <option value="ADMIN">مدير نظام</option>
                    <option value="LAB_STAFF">موظف مختبر</option>
                  </select>
                </Field>
              </>
            )}

            <Field label="البريد الإلكتروني">
              <input type="email" required className="input" placeholder="doctor@hospital.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>

            <Field label="كلمة المرور">
              <input type="password" required minLength={6} className="input" placeholder="••••••••" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </Field>

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium text-sm transition-colors mt-2">
              {loading ? "جاري التحميل..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="text-sky-600 font-medium hover:underline">
              {mode === "login" ? "سجّل الآن" : "تسجيل الدخول"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
