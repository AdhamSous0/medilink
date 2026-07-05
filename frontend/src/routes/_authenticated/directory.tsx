import { useEffect, useState, useMemo } from "react";
import { createFileRoute, useNavigate, Outlet, useChildMatches } from "@tanstack/react-router";
import {
  Building2, FlaskConical, Search, Star, StarOff, Stethoscope,
  MapPin, Phone, Clock, CheckCircle2, AlertCircle, XCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/directory")({
  head: () => ({ meta: [{ title: "Directory — MediLink" }] }),
  component: DirectoryPage,
});

type Tab = "doctors" | "centers" | "labs";
type Entity = Record<string, any>;

const AVAILABILITY_META: Record<string, { label: string; color: string; dot: string }> = {
  available:      { label: "متاح",         color: "text-emerald-600", dot: "bg-emerald-500" },
  limited:        { label: "محدود",         color: "text-amber-600",   dot: "bg-amber-500" },
  busy:           { label: "مشغول",         color: "text-orange-600",  dot: "bg-orange-500" },
  on_leave:       { label: "في إجازة",      color: "text-blue-600",    dot: "bg-blue-500" },
  vacation:       { label: "في عطلة",       color: "text-purple-600",  dot: "bg-purple-500" },
  offline:        { label: "غير متصل",      color: "text-gray-500",    dot: "bg-gray-400" },
  unavailable:    { label: "غير متاح",      color: "text-rose-600",    dot: "bg-rose-500" },
  full_capacity:  { label: "مكتمل",         color: "text-rose-600",    dot: "bg-rose-500" },
  closed:         { label: "مغلق",          color: "text-rose-700",    dot: "bg-rose-700" },
  maintenance:    { label: "صيانة",         color: "text-yellow-700",  dot: "bg-yellow-500" },
};

const SPECIALTIES = [
  "CARDIOLOGY","NEUROLOGY","ORTHOPEDICS","PEDIATRICS","OBSTETRICS_GYNECOLOGY",
  "DERMATOLOGY","PSYCHIATRY","RADIOLOGY","SURGERY","ONCOLOGY","ENDOCRINOLOGY",
  "GASTROENTEROLOGY","PULMONOLOGY","NEPHROLOGY","UROLOGY","OPHTHALMOLOGY","ENT",
  "GENERAL_PRACTICE","INTERNAL_MEDICINE","PATHOLOGY","OTHER",
];

const SPECIALTY_AR: Record<string, string> = {
  CARDIOLOGY:"أمراض القلب", NEUROLOGY:"الأعصاب", ORTHOPEDICS:"العظام",
  PEDIATRICS:"الأطفال", OBSTETRICS_GYNECOLOGY:"النساء والتوليد", DERMATOLOGY:"الجلدية",
  PSYCHIATRY:"الطب النفسي", RADIOLOGY:"الأشعة", SURGERY:"الجراحة", ONCOLOGY:"الأورام",
  ENDOCRINOLOGY:"الغدد الصماء", GASTROENTEROLOGY:"الجهاز الهضمي", PULMONOLOGY:"الجهاز التنفسي",
  NEPHROLOGY:"أمراض الكلى", UROLOGY:"المسالك البولية", OPHTHALMOLOGY:"العيون",
  ENT:"الأنف والأذن والحنجرة", GENERAL_PRACTICE:"الطب العام", INTERNAL_MEDICINE:"الباطنية",
  PATHOLOGY:"علم الأمراض", OTHER:"أخرى",
};

function AvailabilityBadge({ status }: { status?: string }) {
  const meta = AVAILABILITY_META[status ?? ""] ?? AVAILABILITY_META["offline"];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <span className={meta.color}>{meta.label}</span>
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-card">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function EntityCard({ entity, tab, favorites, onFavoriteToggle, onView }: {
  entity: Entity;
  tab: Tab;
  favorites: Set<string>;
  onFavoriteToggle: (id: string) => void;
  onView: (id: string) => void;
}) {
  const isFav = favorites.has(entity.id);
  const name = entity.organization_name || entity.full_name || entity.email;
  const sub = tab === "doctors"
    ? (entity.specialty ? (SPECIALTY_AR[entity.specialty] ?? entity.specialty) : "")
    : entity.provider_type ?? "";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white text-lg font-bold
            ${tab === "doctors" ? "bg-primary" : tab === "centers" ? "bg-accent" : "bg-emerald-600"}`}>
            {tab === "doctors" ? <Stethoscope className="h-5 w-5" /> :
             tab === "centers" ? <Building2 className="h-5 w-5" /> :
             <FlaskConical className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] truncate">{name}</div>
            {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
            <div className="mt-1"><AvailabilityBadge status={entity.availability_status} /></div>
          </div>
        </div>
        <button
          onClick={() => onFavoriteToggle(entity.id)}
          className="shrink-0 text-muted-foreground hover:text-warning transition-colors"
          title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          {isFav
            ? <Star className="h-4 w-4 fill-warning text-warning" />
            : <Star className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-1 text-[12px] text-muted-foreground">
        {entity.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{entity.city}</span>
          </div>
        )}
        {entity.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span dir="ltr">{entity.phone}</span>
          </div>
        )}
        {entity.working_hours && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{entity.working_hours}</span>
          </div>
        )}
      </div>

      {entity.bio && (
        <p className="text-[12px] text-muted-foreground line-clamp-2">{entity.bio}</p>
      )}

      {entity.services && entity.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(entity.services as string[]).slice(0, 4).map((s) => (
            <span key={s} className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">{s}</span>
          ))}
          {entity.services.length > 4 && (
            <span className="text-[10px] text-muted-foreground self-center">+{entity.services.length - 4}</span>
          )}
        </div>
      )}

      <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => onView(entity.id)}>
        عرض الملف الشخصي
      </Button>
    </div>
  );
}

function DirectoryPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <DirectoryList />;
}

function DirectoryList() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("centers");
  const [data, setData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [availFilter, setAvailFilter] = useState("");

  async function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (specialty) params.specialty = specialty;
    if (city) params.city = city;
    if (availFilter) params.availability = availFilter;

    const fn = tab === "doctors" ? api.getDoctors : tab === "centers" ? api.getCenters : api.getLabs;
    const { data: rows } = await fn(params);
    setData((rows as Entity[]) ?? []);
    setLoading(false);
  }

  async function loadFavorites() {
    if (!user) return;
    const { data: favs } = await api.getFavorites();
    if (favs) setFavorites(new Set((favs as Entity[]).map((f) => f.id)));
  }

  useEffect(() => { void load(); }, [tab, specialty, city, availFilter]);
  useEffect(() => { void loadFavorites(); }, [user?.id]);

  async function toggleFavorite(id: string) {
    const isFav = favorites.has(id);
    if (isFav) {
      await api.removeFavorite(id);
      setFavorites((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success("تم الإزالة من المفضلة");
    } else {
      await api.addFavorite(id);
      setFavorites((s) => new Set([...s, id]));
      toast.success("تمت الإضافة للمفضلة");
    }
  }

  function viewProfile(id: string) {
    navigate({ to: "/directory/$id", params: { id } });
  }

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((e) =>
      (e.full_name ?? "").toLowerCase().includes(q) ||
      (e.organization_name ?? "").toLowerCase().includes(q) ||
      (e.specialty ?? "").toLowerCase().includes(q) ||
      (e.city ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: "centers", label: t("allCenters"), icon: Building2 },
    { key: "doctors", label: t("allDoctors"), icon: Stethoscope },
    { key: "labs",    label: t("allLabs"),    icon: FlaskConical },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("directory")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("directoryDesc")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setData([]); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
              ${tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchDirectory")}
            className="h-9 pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {tab === "doctors" && (
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{t("allSpecialties")}</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{SPECIALTY_AR[s] ?? s}</option>
            ))}
          </select>
        )}

        <Input
          placeholder={t("filterCity")}
          className="h-9 w-36 text-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <select
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("allAvailability")}</option>
          <option value="available">متاح</option>
          <option value="limited">محدود</option>
          <option value="busy">مشغول</option>
          <option value="unavailable">غير متاح</option>
          <option value="closed">مغلق</option>
        </select>

        {(search || specialty || city || availFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSpecialty(""); setCity(""); setAvailFilter(""); }}>
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={tab === "doctors" ? Stethoscope : tab === "centers" ? Building2 : FlaskConical}
          title={tab === "doctors" ? t("noDoctors") : tab === "centers" ? t("noCentersFound") : t("noLabsFound")}
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} نتيجة</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                tab={tab}
                favorites={favorites}
                onFavoriteToggle={toggleFavorite}
                onView={viewProfile}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
