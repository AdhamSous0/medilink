import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Building2, FileText, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediLink — Connected Healthcare Collaboration" },
      {
        name: "description",
        content:
          "MediLink connects doctors, clinics, labs and patients in one continuous care network — referrals, reports and follow-ups in a single workflow.",
      },
      { property: "og:title", content: "MediLink — Connected Healthcare Collaboration" },
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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">MediLink</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Healthcare collaboration network
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            One connected network for{" "}
            <span className="text-primary">continuous patient care</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            MediLink links doctors, clinics, medical centers, labs and patients — so referrals,
            reports and follow-ups never fall through the cracks.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="gap-2">
                Create your account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Stethoscope,
                title: "For Doctors",
                desc: "Create referrals, track patient progress, share clinical notes — without phone tag.",
              },
              {
                icon: Building2,
                title: "For Centers & Labs",
                desc: "Accept referrals, schedule appointments, upload reports back to the referring doctor instantly.",
              },
              {
                icon: UserRound,
                title: "For Patients",
                desc: "See every referral, appointment and report from each provider — in one place.",
              },
            ].map(({ icon: Icon, title, desc }) => (
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
              <FileText className="h-3.5 w-3.5" /> Referral workflow
            </div>
            <ol className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              {[
                "Doctor creates referral",
                "Center accepts & schedules",
                "Report uploaded",
                "Doctor reviews & continues care",
              ].map((step, i) => (
                <li
                  key={step}
                  className="rounded-lg border border-border bg-card p-4 shadow-card"
                >
                  <div className="text-xs font-medium text-primary">Step {i + 1}</div>
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
          <span>Connected care, end to end.</span>
        </div>
      </footer>
    </div>
  );
}
