import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Building2, FileText, Languages, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediLink — Connected Healthcare Collaboration | ميدي لينك" },
      {
        name: "description",
        content:
          "MediLink connects doctors, clinics, labs and patients in one continuous care network. ميدي لينك يربط الأطباء والمراكز الطبية والمختبرات والمرضى بشبكة رعاية واحدة متكاملة.",
      },
      { property: "og:title", content: "MediLink — Connected Healthcare Collaboration | ميدي لينك" },
      {
        property: "og:description",
        content:
          "One connected healthcare ecosystem where providers collaborate and patients have a continuous journey.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, lang, setLang, dir } = useI18n();

  const audiences = [
    { icon: Stethoscope, title: t("landingForDoctorsTitle"), desc: t("landingForDoctorsDesc") },
    { icon: Building2, title: t("landingForCentersTitle"), desc: t("landingForCentersDesc") },
    { icon: UserRound, title: t("landingForPatientsTitle"), desc: t("landingForPatientsDesc") },
  ];

  const steps = [t("landingStep1"), t("landingStep2"), t("landingStep3"), t("landingStep4")];

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">MediLink</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-surface transition-colors"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "ar" ? t("switchToEnglish") : t("switchToArabic")}
            </button>
            <Link to="/auth">
              <Button variant="ghost" size="sm">{t("signIn")}</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">{t("landingCreateAccount")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t("landingNetworkBadge")}
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            {t("landingHeroTitle")}{" "}
            <span className="text-primary">{t("landingHeroHighlight")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            {t("landingHeroDesc")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="gap-2">
                {t("landingCreateAccount")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">{t("signIn")}</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-border bg-surface p-8">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> {t("landingWorkflowTitle")}
            </div>
            <ol className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step}
                  className="rounded-lg border border-border bg-card p-4 shadow-card"
                >
                  <div className="text-xs font-medium text-primary">{t("landingStep")} {i + 1}</div>
                  <div className="mt-1 font-medium">{step}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MediLink</span>
          <span>{t("landingFooterTagline")}</span>
        </div>
      </footer>
    </div>
  );
}
