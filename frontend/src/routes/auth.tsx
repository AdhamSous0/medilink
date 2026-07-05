import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Activity, Building2, Languages, Loader2, Stethoscope, UserRound } from "lucide-react";
import { toast } from "sonner";

import { auth, getSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — MediLink" },
      { name: "description", content: "Sign in or create an account on MediLink." },
    ],
  }),
  component: AuthPage,
});

type Role = "doctor" | "medical_center" | "patient";
type ProviderType = "clinic" | "medical_center" | "laboratory" | "radiology_center";

function AuthPage() {
  const { mode } = Route.useSearch();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("patient");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [providerType, setProviderType] = useState<ProviderType>("clinic");

  useEffect(() => setIsSignup(mode === "signup"), [mode]);
  useEffect(() => { if (getSession()) navigate({ to: "/dashboard", replace: true }); }, [navigate]);

  const roles: { value: Role; labelKey: string; icon: typeof Stethoscope; descKey: string }[] = [
    { value: "doctor", labelKey: "doctorRole", icon: Stethoscope, descKey: "referPatients" },
    { value: "medical_center", labelKey: "centerLab", icon: Building2, descKey: "receiveReferrals" },
    { value: "patient", labelKey: "patientRole", icon: UserRound, descKey: "trackCare" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              specialty: role === "doctor" ? specialty : "",
              organization_name: role === "medical_center" ? organizationName : "",
              provider_type: role === "medical_center" ? providerType : "",
            },
          },
        });
        if (error) throw error;
        toast.success(t("accountCreated"));
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("signedIn"));
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("authFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MediLink</span>
        </Link>

        <div className="relative space-y-5">
          <h2 className="text-4xl font-bold leading-tight">{t("connectedCare")}</h2>
          <p className="max-w-sm text-[15px] text-primary-foreground/75 leading-relaxed">
            {t("connectedCareDesc")}
          </p>
          {/* Feature bullets */}
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            {["🏥 رعاية متصلة من البداية للنهاية", "📋 مشاركة التقارير آمنة", "🔔 إشعارات فورية"].map((item) => (
              <li key={item} className="flex items-center gap-2">{item}</li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} MediLink. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold tracking-tight">MediLink</span>
            </Link>
            <div className="hidden lg:block" />
            <button
              type="button"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-surface transition-colors"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "ar" ? t("switchToEnglish") : t("switchToArabic")}
            </button>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight">
              {isSignup ? t("createYourAccount") : t("welcomeBack")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isSignup ? t("joinNetwork") : t("signInToWorkspace")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <>
                {/* Role selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("iAm")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((r) => {
                      const Icon = r.icon;
                      const selected = role === r.value;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                            selected
                              ? "border-primary bg-primary-soft shadow-sm"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <Icon className={`h-4 w-4 mb-2 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          <div className={`text-xs font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                            {t(r.labelKey as any)}
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight hidden sm:block">
                            {t(r.descKey as any)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FormField label={t("fullName")} htmlFor="fullName">
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
                </FormField>

                {role === "doctor" && (
                  <FormField label={t("specialty")} htmlFor="specialty">
                    <Input id="specialty" placeholder={t("specialtyPlaceholder")} value={specialty} onChange={(e) => setSpecialty(e.target.value)} maxLength={100} />
                  </FormField>
                )}

                {role === "medical_center" && (
                  <>
                    <FormField label={t("organizationName")} htmlFor="organizationName">
                      <Input id="organizationName" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} maxLength={150} required />
                    </FormField>
                    <FormField label={t("type")} htmlFor="providerType">
                      <Select value={providerType} onValueChange={(v) => setProviderType(v as ProviderType)}>
                        <SelectTrigger id="providerType"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clinic">{t("clinic")}</SelectItem>
                          <SelectItem value="medical_center">{t("medicalCenter")}</SelectItem>
                          <SelectItem value="laboratory">{t("laboratory")}</SelectItem>
                          <SelectItem value="radiology_center">{t("radiologyCenter")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </>
                )}
              </>
            )}

            <FormField label={t("email")} htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </FormField>

            <FormField label={t("password")} htmlFor="password">
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isSignup ? "new-password" : "current-password"} />
            </FormField>

            <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("pleaseWait")}</>
              ) : (
                isSignup ? t("createAccount") : t("signIn")
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            {isSignup ? t("alreadyHaveAccount") : t("newToMediLink")}{" "}
            <button
              type="button"
              onClick={() => setIsSignup((s) => !s)}
              className="font-semibold text-primary hover:underline underline-offset-2"
            >
              {isSignup ? t("signIn") : t("createAccount")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-medium">{label}</Label>
      {children}
    </div>
  );
}
