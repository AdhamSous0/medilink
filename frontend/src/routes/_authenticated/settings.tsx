import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Eye, EyeOff, Loader2, Lock, Radio, Stethoscope, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MediLink" }] }),
  component: SettingsPage,
});

const roleIcons: Partial<Record<AppRole, typeof Stethoscope>> = {
  doctor: Stethoscope,
  medical_center: Building2,
  patient: UserRound,
};

function SettingsPage() {
  const { profile, user, role } = useCurrentUser();
  const { t } = useI18n();

  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const RoleIcon = role ? (roleIcons[role] ?? UserRound) : UserRound;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("accountDetails")}</p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-soft to-accent-soft" />
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-5 flex items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-card shadow-elevated">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1 min-w-0">
              <h2 className="text-lg font-semibold leading-tight truncate">
                {profile?.full_name ?? user?.email ?? "—"}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <RoleIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="capitalize">{role?.replace("_", " ") ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("fullName")} value={profile?.full_name} />
            <Field label={t("email")} value={user?.email} />
            {profile?.phone && <Field label={t("phone")} value={profile.phone} />}
            {profile?.specialty && <Field label={t("specialty")} value={profile.specialty} />}
            {profile?.organization_name && <Field label={t("organization")} value={profile.organization_name} />}
            {profile?.provider_type && (
              <Field label={t("providerType")} value={profile.provider_type.replace(/_/g, " ")} />
            )}
          </div>
        </div>
      </div>

      {/* Availability card for doctors and centers */}
      {(role === "doctor" || role === "medical_center" || role === "laboratory") && (
        <AvailabilityCard />
      )}

      {/* Password change card */}
      <ChangePasswordCard />
    </div>
  );
}

const DOCTOR_STATUSES = [
  { key: "available", label: "متاح", color: "text-emerald-600", bg: "bg-emerald-500" },
  { key: "busy",      label: "مشغول", color: "text-orange-600", bg: "bg-orange-500" },
  { key: "on_leave",  label: "في إجازة", color: "text-blue-600", bg: "bg-blue-500" },
  { key: "vacation",  label: "في عطلة", color: "text-purple-600", bg: "bg-purple-500" },
  { key: "offline",   label: "غير متصل", color: "text-gray-500", bg: "bg-gray-400" },
];
const CENTER_STATUSES = [
  { key: "available",     label: "متاح",       color: "text-emerald-600", bg: "bg-emerald-500" },
  { key: "limited",       label: "محدود",       color: "text-amber-600",   bg: "bg-amber-500" },
  { key: "busy",          label: "مشغول",       color: "text-orange-600",  bg: "bg-orange-500" },
  { key: "full_capacity", label: "مكتمل",       color: "text-rose-600",    bg: "bg-rose-500" },
  { key: "closed",        label: "مغلق",        color: "text-rose-700",    bg: "bg-rose-700" },
  { key: "maintenance",   label: "صيانة",       color: "text-yellow-700",  bg: "bg-yellow-500" },
];

function AvailabilityCard() {
  const { t } = useI18n();
  const { role } = useCurrentUser();
  const [current, setCurrent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getMyAvailability().then(({ data }) => {
      if (data) setCurrent((data as any).availability_status ?? "available");
    });
  }, []);

  async function update(status: string) {
    setLoading(true);
    await api.updateAvailability(status);
    setCurrent(status);
    setLoading(false);
    toast.success(t("availabilityUpdated"));
  }

  const statuses = role === "doctor" ? DOCTOR_STATUSES : CENTER_STATUSES;

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft">
          <Radio className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">{t("myAvailability")}</h3>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
      </div>
      <div className="px-6 py-5">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s.key}
              onClick={() => update(s.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                ${current === s.key
                  ? `border-current ${s.color} bg-current/10 shadow-sm`
                  : "border-border text-muted-foreground hover:border-current hover:text-foreground"}`}
            >
              <span className={`h-2 w-2 rounded-full ${current === s.key ? s.bg : "bg-muted-foreground/40"}`} />
              <span className={current === s.key ? s.color : ""}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error(t("passwordMismatch")); return; }
    setLoading(true);
    const { error } = await api.changePassword({ currentPassword: current, newPassword: next });
    setLoading(false);
    if (error) { toast.error(t("passwordChangeFailed")); return; }
    toast.success(t("passwordChanged"));
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">{t("security")}</h3>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <PasswordField
          label={t("currentPassword")}
          value={current}
          onChange={setCurrent}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
        />
        <PasswordField
          label={t("newPassword")}
          value={next}
          onChange={setNext}
          show={showNext}
          onToggle={() => setShowNext((v) => !v)}
        />
        <PasswordField
          label={t("confirmNewPassword")}
          value={confirm}
          onChange={setConfirm}
          show={showNext}
          onToggle={() => setShowNext((v) => !v)}
        />
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={loading || !current || !next || !confirm} size="sm">
            {loading && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" />}
            {t("changePassword")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({
  label, value, onChange, show, onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 pe-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-snug">
        {value ? <span className="font-medium">{value}</span> : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
