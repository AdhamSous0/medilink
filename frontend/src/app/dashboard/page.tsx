"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, clearAuth, AuthUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: "طبيب",
  ADMIN: "مدير",
  LAB_STAFF: "مختبر",
  PATIENT: "مريض",
};

const STATS = [
  { key: "out",     label: "إحالات صادرة",  icon: "↗", color: "bg-sky-50   text-sky-600   border-sky-100" },
  { key: "in",      label: "إحالات واردة",  icon: "↙", color: "bg-violet-50 text-violet-600 border-violet-100" },
  { key: "pending", label: "قيد الانتظار",  icon: "⏳", color: "bg-amber-50  text-amber-600  border-amber-100" },
  { key: "done",    label: "مكتملة",         icon: "✓",  color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.replace("/login"); return; }
    setUser(auth);
  }, [router]);

  const logout = () => { clearAuth(); router.push("/login"); };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 right-0 w-64 bg-[#0f172a] flex flex-col hidden lg:flex">
        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg">MediLink</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { href: "/dashboard",     label: "لوحة التحكم", icon: "⊞" },
            { href: "/referrals/new", label: "إحالة جديدة",  icon: "+" },
            { href: "/referrals",     label: "الإحالات",     icon: "≡" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors text-sm"
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-slate-400 text-xs">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full mt-2 text-right px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-700/30">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="font-bold text-slate-800">MediLink</span>
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-red-500">خروج</button>
      </header>

      {/* Main content */}
      <main className="lg:mr-64 p-6">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            مرحباً، {user.fullName.split(" ").slice(0, 2).join(" ")} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">إليك ملخص نشاطك اليوم</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map((s) => (
            <div key={s.key} className={`rounded-xl border p-5 ${s.color}`}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-3xl font-bold">—</p>
              <p className="text-sm mt-1 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/referrals/new" className="group flex items-center gap-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl p-5 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl group-hover:bg-white/30 transition-colors">+</div>
            <div>
              <p className="font-semibold">إنشاء إحالة جديدة</p>
              <p className="text-sky-100 text-sm">أرسل إحالة لطبيب أو تخصص</p>
            </div>
          </Link>
          <Link href="/referrals" className="group flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-5 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">≡</div>
            <div>
              <p className="font-semibold">عرض كل الإحالات</p>
              <p className="text-slate-400 text-sm">صادرة · واردة · قيد المعالجة</p>
            </div>
          </Link>
        </div>

        {/* Recent referrals table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">آخر الإحالات</h2>
            <Link href="/referrals/new" className="text-sm text-sky-600 hover:underline">+ جديد</Link>
          </div>
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-2xl">📋</div>
            <p className="font-medium text-slate-700">لا توجد إحالات بعد</p>
            <p className="text-slate-400 text-sm mt-1">ابدأ بإنشاء أول إحالة طبية</p>
            <Link href="/referrals/new" className="inline-block mt-5 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors">
              إنشاء إحالة
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
