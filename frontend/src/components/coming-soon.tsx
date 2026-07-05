import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
