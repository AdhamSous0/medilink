import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Search, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface SearchResult {
  referrals: Array<{ id: string; patient_name: string; status: string; reason: string }>;
  patients: Array<{ patient_name: string; patient_phone: string | null; referral_count: number }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) { setResults(null); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await api.search(query);
      setResults((data as SearchResult) ?? null);
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (!open) return null;

  const hasResults = results && (results.referrals.length > 0 || results.patients.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background shadow-elevated overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholderCmd")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
          )}

          {!loading && results && results.referrals.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("searchReferrals")}
              </p>
              {results.referrals.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { navigate({ to: "/referrals/$id", params: { id: r.id } }); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.patient_name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.reason}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] capitalize">
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && results && results.patients.length > 0 && (
            <div>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("searchPatients")}
              </p>
              {results.patients.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { navigate({ to: "/patients" }); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.patient_name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.patient_phone ?? t("noPhone")}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {p.referral_count} {p.referral_count === 1 ? t("referral") : t("referralsPlural")}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("pressEnterToSearch")}</p>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-2">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd>
          <span className="text-[11px] text-muted-foreground">{t("cancel")}</span>
        </div>
      </div>
    </div>
  );
}
