import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Building2, Clock, FlaskConical, Loader2, MapPin, Phone,
  Plus, Star, Stethoscope, Trash2, Globe, Users, UserPlus, X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/directory/$id")({
  head: () => ({ meta: [{ title: "Profile — MediLink" }] }),
  component: ProfilePage,
});

type Equipment = { id: string; name: string; status: string; notes?: string };

const AVAILABILITY_META: Record<string, { label: string; color: string; dot: string }> = {
  available:     { label: "متاح",       color: "text-emerald-600", dot: "bg-emerald-500" },
  limited:       { label: "محدود",       color: "text-amber-600",   dot: "bg-amber-500" },
  busy:          { label: "مشغول",       color: "text-orange-600",  dot: "bg-orange-500" },
  on_leave:      { label: "في إجازة",    color: "text-blue-600",    dot: "bg-blue-500" },
  vacation:      { label: "في عطلة",     color: "text-purple-600",  dot: "bg-purple-500" },
  offline:       { label: "غير متصل",    color: "text-gray-500",    dot: "bg-gray-400" },
  unavailable:   { label: "غير متاح",    color: "text-rose-600",    dot: "bg-rose-500" },
  full_capacity: { label: "مكتمل",       color: "text-rose-600",    dot: "bg-rose-500" },
  closed:        { label: "مغلق",        color: "text-rose-700",    dot: "bg-rose-700" },
  maintenance:   { label: "صيانة",       color: "text-yellow-700",  dot: "bg-yellow-500" },
};

const EQUIPMENT_STATUS_META: Record<string, { label: string; color: string }> = {
  available:       { label: "متاح",           color: "text-emerald-600" },
  busy:            { label: "مشغول",           color: "text-orange-600" },
  out_of_service:  { label: "خارج الخدمة",    color: "text-rose-600" },
  maintenance:     { label: "صيانة",           color: "text-yellow-700" },
};

const SPECIALTY_AR: Record<string, string> = {
  CARDIOLOGY:"أمراض القلب", NEUROLOGY:"الأعصاب", ORTHOPEDICS:"العظام",
  PEDIATRICS:"الأطفال", OBSTETRICS_GYNECOLOGY:"النساء والتوليد", DERMATOLOGY:"الجلدية",
  PSYCHIATRY:"الطب النفسي", RADIOLOGY:"الأشعة", SURGERY:"الجراحة", ONCOLOGY:"الأورام",
  ENDOCRINOLOGY:"الغدد الصماء", GASTROENTEROLOGY:"الجهاز الهضمي", PULMONOLOGY:"الجهاز التنفسي",
  NEPHROLOGY:"أمراض الكلى", UROLOGY:"المسالك البولية", OPHTHALMOLOGY:"العيون",
  ENT:"الأنف والأذن والحنجرة", GENERAL_PRACTICE:"الطب العام", INTERNAL_MEDICINE:"الباطنية",
  PATHOLOGY:"علم الأمراض", OTHER:"أخرى",
};

function ProfilePage() {
  const { id } = Route.useParams();
  const { user, role } = useCurrentUser();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [doctors, setDoctors] = useState<Record<string, any>[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [newEquip, setNewEquip] = useState({ name: "", status: "available" });
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  async function load() {
    setLoading(true);
    const [centerRes, doctorRes, favRes] = await Promise.all([
      api.getDirectoryCenter(id),
      api.getDoctor(id),
      user ? api.checkFavorite(id) : Promise.resolve({ data: { favorited: false }, error: null }),
    ]);
    const p = centerRes.data ?? doctorRes.data;
    const fav = favRes.data;
    const prof = p as Record<string, any> | null;
    setProfile(prof);
    setEquipment((prof?.equipment as Equipment[]) ?? []);
    setDoctors((prof?.doctors as Record<string, any>[]) ?? []);
    setFavorited((fav as any)?.favorited ?? false);
    setIsOwner(user?.id === id);
    setLoading(false);
  }


  useEffect(() => { void load(); }, [id, user?.id]);

  async function toggleFavorite() {
    if (favorited) {
      await api.removeFavorite(id);
      setFavorited(false);
      toast.success("تم الإزالة من المفضلة");
    } else {
      await api.addFavorite(id);
      setFavorited(true);
      toast.success("تمت الإضافة للمفضلة");
    }
  }

  async function addEquipment() {
    if (!newEquip.name) return;
    const { data } = await api.addEquipment(newEquip);
    if (data) {
      setEquipment((prev) => [...prev, { id: (data as any).id, ...newEquip }]);
      setNewEquip({ name: "", status: "available" });
      setShowAddEquip(false);
      toast.success("تم إضافة الجهاز");
    }
  }

  async function updateEquipStatus(eqId: string, status: string) {
    await api.updateEquipment(eqId, { status });
    setEquipment((prev) => prev.map((e) => e.id === eqId ? { ...e, status } : e));
  }

  async function deleteEquip(eqId: string) {
    await api.deleteEquipment(eqId);
    setEquipment((prev) => prev.filter((e) => e.id !== eqId));
    toast.success("تم حذف الجهاز");
  }

  async function sendInvite() {
    if (!user) return;
    setInviteSending(true);
    const { error } = await api.sendInvitation(user.id, id, inviteMsg || undefined);
    setInviteSending(false);
    if (error) {
      toast.error("فشل إرسال الدعوة، ربما تم إرسالها مسبقاً");
    } else {
      setInviteSent(true);
      setShowInviteDialog(false);
      toast.success("تم إرسال الدعوة للطبيب");
    }
  }

  async function updateAvailability(status: string) {
    await api.updateAvailability(status);
    setProfile((p) => p ? { ...p, availability_status: status } : p);
    toast.success(t("availabilityUpdated"));
  }

  if (loading) return (
    <div className="grid place-items-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!profile) return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <p className="text-sm text-muted-foreground">الملف الشخصي غير موجود.</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: "/directory" })}>رجوع</Button>
    </div>
  );

  const avMeta = AVAILABILITY_META[profile.availability_status ?? "offline"] ?? AVAILABILITY_META["offline"];
  const isCenter = profile.role === "MEDICAL_CENTER" || profile.role === "LAB_STAFF";
  const isDoctor = profile.role === "DOCTOR";
  const name = profile.organization_name || profile.full_name;
  const canInvite = role === "medical_center" && isDoctor && !isOwner;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/directory" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> الدليل
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white
              ${profile.role === "DOCTOR" ? "bg-primary" : profile.role === "LAB_STAFF" ? "bg-emerald-600" : "bg-accent"}`}>
              {profile.role === "DOCTOR" ? <Stethoscope className="h-8 w-8" /> :
               profile.role === "LAB_STAFF" ? <FlaskConical className="h-8 w-8" /> :
               <Building2 className="h-8 w-8" />}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{name}</h1>
              {profile.specialty && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {SPECIALTY_AR[profile.specialty] ?? profile.specialty}
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${avMeta.dot}`} />
                <span className={`text-sm font-medium ${avMeta.color}`}>{avMeta.label}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {canInvite && (
              <Button
                size="sm"
                variant={inviteSent ? "ghost" : "default"}
                onClick={() => !inviteSent && setShowInviteDialog(true)}
                disabled={inviteSent}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {inviteSent ? "تم إرسال الدعوة ✓" : "دعوة للانضمام"}
              </Button>
            )}
            {user && user.id !== id && (
              <Button variant="outline" size="sm" onClick={toggleFavorite}>
                <Star className={`mr-1.5 h-4 w-4 ${favorited ? "fill-warning text-warning" : ""}`} />
                {favorited ? t("removeFromFavorites") : t("addToFavorites")}
              </Button>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {profile.city && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>}
          {profile.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.address}</span>}
          {profile.phone && <span className="flex items-center gap-1.5" dir="ltr"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
          {profile.working_hours && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{profile.working_hours}</span>}
          {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="h-3.5 w-3.5" />{profile.website}</a>}
        </div>

        {profile.bio && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>}

        {profile.years_exp && (
          <p className="mt-2 text-xs text-muted-foreground">{profile.years_exp} {t("yearsExp")}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Services */}
        {profile.services && profile.services.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold mb-3">{t("services")}</h2>
            <div className="flex flex-wrap gap-2">
              {(profile.services as string[]).map((s) => (
                <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary">{s}</span>
              ))}
            </div>
          </section>
        )}

        {/* Availability management (owner only) */}
        {isOwner && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold mb-3">{t("updateAvailability")}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(AVAILABILITY_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => updateAvailability(key)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-all
                    ${profile.availability_status === key
                      ? `border-current ${meta.color} bg-current/10`
                      : "border-border text-muted-foreground hover:border-current hover:text-foreground"}`}
                >
                  <span className={meta.color}>{meta.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Affiliated Doctors */}
      {isCenter && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">الأطباء المرتبطون بالمركز</h2>
            <span className="mr-auto text-xs text-muted-foreground">{doctors.length} طبيب</span>
          </div>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد أطباء مرتبطون بعد.</p>
          ) : (
            <div className="space-y-3">
              {doctors.map((doc) => {
                const avMeta = AVAILABILITY_META[doc.availability_status ?? "offline"] ?? AVAILABILITY_META["offline"];
                const specialty = SPECIALTY_AR[doc.specialty] ?? doc.specialty ?? "—";
                const schedule = (doc.schedule as Array<{ id: string; day_of_week: number; start_time: string; end_time: string; notes?: string }>) ?? [];
                const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
                return (
                  <div key={doc.id} className="rounded-lg border border-border bg-background overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface transition-colors"
                      onClick={() => navigate({ to: "/directory/$id", params: { id: doc.id } })}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{doc.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{specialty}</div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${avMeta.dot}`} />
                          <span className={`text-[10px] ${avMeta.color}`}>{avMeta.label}</span>
                        </div>
                      </div>
                    </div>
                    {schedule.length > 0 && (
                      <div className="border-t border-border bg-surface/50 px-3 py-2 space-y-1">
                        {schedule.map((slot) => (
                          <div key={slot.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="w-14 shrink-0 font-medium text-foreground">{DAYS_AR[slot.day_of_week]}</span>
                            <span dir="ltr">{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</span>
                            {slot.notes && <span className="truncate text-muted-foreground">· {slot.notes}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Invite Doctor Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowInviteDialog(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-elevated p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-base">دعوة طبيب للانضمام</h2>
                <p className="text-sm text-muted-foreground mt-0.5">دعوة <span className="font-medium text-foreground">{name}</span> للتعاون مع مركزك</p>
              </div>
              <button onClick={() => setShowInviteDialog(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">رسالة اختيارية</label>
              <textarea
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                placeholder="أضف رسالة شخصية للطبيب..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowInviteDialog(false)}>إلغاء</Button>
              <Button size="sm" onClick={sendInvite} disabled={inviteSending}>
                {inviteSending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                إرسال الدعوة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment (centers & labs) */}
      {(isCenter || isOwner) && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">{t("equipment")}</h2>
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setShowAddEquip((v) => !v)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("addEquipment")}
              </Button>
            )}
          </div>

          {showAddEquip && (
            <div className="mb-4 rounded-lg border border-border bg-surface p-4 space-y-3">
              <input
                placeholder={t("equipmentName")}
                value={newEquip.name}
                onChange={(e) => setNewEquip((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <select
                value={newEquip.status}
                onChange={(e) => setNewEquip((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.entries(EQUIPMENT_STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={addEquipment}>حفظ</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddEquip(false)}>{t("cancel")}</Button>
              </div>
            </div>
          )}

          {equipment.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noEquipment")}</p>
          ) : (
            <div className="space-y-2">
              {equipment.map((eq) => {
                const sm = EQUIPMENT_STATUS_META[eq.status] ?? EQUIPMENT_STATUS_META["available"];
                return (
                  <div key={eq.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                    <div>
                      <span className="text-[13px] font-medium">{eq.name}</span>
                      <span className={`ml-2 text-[11px] font-medium ${sm.color}`}>{sm.label}</span>
                      {eq.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{eq.notes}</p>}
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <select
                          value={eq.status}
                          onChange={(e) => updateEquipStatus(eq.id, e.target.value)}
                          className="rounded border border-input bg-background px-2 py-1 text-[11px] focus:outline-none"
                        >
                          {Object.entries(EQUIPMENT_STATUS_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                        <button onClick={() => deleteEquip(eq.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
