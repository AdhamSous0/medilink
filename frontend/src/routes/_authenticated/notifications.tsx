import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Check, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MediLink" }] }),
  component: NotificationsPage,
});

type Row = {
  id: string; type: string; title: string;
  message: string | null; link: string | null;
  read: boolean; created_at: string;
  invitation_id?: string;
  responded?: boolean;
};

function groupByDate(rows: Row[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups: { label: string; items: Row[] }[] = [];
  const map = new Map<string, Row[]>();

  for (const row of rows) {
    const d = new Date(row.created_at); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "__today__";
    else if (d.getTime() === yesterday.getTime()) label = "__yesterday__";
    else label = d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(row);
  }

  map.forEach((items, label) => groups.push({ label, items }));
  return groups;
}

function NotificationsPage() {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [respondedSet, setRespondedSet] = useState<Set<string>>(new Set());
  const [pendingInvites, setPendingInvites] = useState<Record<string, string>>({}); // notifId → invitationId
  const navigate = useNavigate();

  async function load() {
    if (!user) return;
    const [notifRes, invRes] = await Promise.all([
      api.getNotifications(),
      api.getInvitations(),
    ]);
    const notifs = (notifRes.data as Row[] | null) ?? [];
    const invitations = (invRes.data as Array<{ id: string; status: string }> | null) ?? [];

    const pendingIds = new Set(
      invitations.filter((inv) => inv.status === "pending").map((inv) => inv.id)
    );

    const pendingMap: Record<string, string> = {};
    const respondedIds = new Set<string>();

    notifs
      .filter((n) => n.type === "invitation")
      .forEach((n) => {
        if (n.invitation_id && pendingIds.has(n.invitation_id)) {
          pendingMap[n.id] = n.invitation_id;
        } else {
          respondedIds.add(n.id);
        }
      });

    setPendingInvites(pendingMap);
    setRespondedSet(respondedIds);
    setRows(notifs);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id]);

  async function markRead(id: string) { await api.markNotificationRead(id); void load(); }
  async function markAllRead() { await api.markAllNotificationsRead(); toast.success(t("allMarkedRead")); void load(); }
  async function remove(id: string) { await api.deleteNotification(id); void load(); }

  async function respondInvitation(notifId: string, invitationId: string, status: "accepted" | "rejected") {
    const { error } = await api.respondToInvitation(invitationId, status);
    if (error) {
      toast.error("فشل الرد على الدعوة");
      return;
    }
    setRespondedSet((s) => new Set([...s, notifId]));
    await api.markNotificationRead(notifId);
    toast.success(status === "accepted" ? "تم قبول الدعوة ✅" : "تم رفض الدعوة");
    void load();
  }

  const unreadCount = rows?.filter((r) => !r.read).length ?? 0;
  const groups = rows ? groupByDate(rows) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("notifications")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("updatesOn")}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </p>
        </div>
        {rows !== null && rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="h-8 text-xs">
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {rows === null ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                <Skeleton className="mt-1 h-2 w-2 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-72" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Bell} title={t("allCaughtUp")} description={t("updatesOn")} />
        ) : (
          <div>
            {groups.map(({ label, items }) => (
              <div key={label}>
                <div className="sticky top-14 border-b border-border bg-muted/40 px-4 py-2 sm:px-6">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label === "__today__" ? t("today" as any) ?? "Today"
                     : label === "__yesterday__" ? t("yesterday" as any) ?? "Yesterday"
                     : label}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={`group flex items-start gap-3 px-4 py-4 sm:px-6 transition-colors hover:bg-surface ${
                        n.read ? "" : "bg-primary-soft/30"
                      }`}
                    >
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors ${n.read ? "bg-border" : "bg-primary"}`} />
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          if (!n.read) void markRead(n.id);
                          if (n.link) navigate({ to: n.link as "/" });
                        }}
                      >
                        <div className={`text-[13px] leading-snug ${n.read ? "font-normal" : "font-medium"}`}>
                          {n.title}
                        </div>
                        {n.message && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">{n.message}</p>
                        )}
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Invitation accept/reject buttons */}
                        {n.type === "invitation" && pendingInvites[n.id] && !respondedSet.has(n.id) && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => respondInvitation(n.id, pendingInvites[n.id], "accepted")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => respondInvitation(n.id, pendingInvites[n.id], "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                        {n.type === "invitation" && respondedSet.has(n.id) && (
                          <span className="text-[11px] text-muted-foreground">تم الرد</span>
                        )}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => markRead(n.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(n.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
