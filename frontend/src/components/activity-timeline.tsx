import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, FileText, MessageSquare, Paperclip,
  RefreshCw, XCircle, AlertCircle, Send, Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineEvent {
  id: string;
  event_type: string;
  actor_name: string | null;
  occurred_at: string;
  payload: string | null;
}

const EVENT_META: Record<string, { icon: typeof CheckCircle2; color: string; labelKey: TranslationKey }> = {
  CREATED:          { icon: FileText,     color: "text-primary",            labelKey: "eventCreated" },
  SENT:             { icon: Send,         color: "text-primary",            labelKey: "eventSent" },
  VIEWED:           { icon: Eye,          color: "text-accent-foreground",  labelKey: "eventViewed" },
  ACCEPTED:         { icon: CheckCircle2, color: "text-success-foreground", labelKey: "eventAccepted" },
  DECLINED:         { icon: XCircle,      color: "text-destructive",        labelKey: "eventDeclined" },
  STARTED:          { icon: Clock,        color: "text-primary",            labelKey: "eventStarted" },
  COMPLETED:        { icon: CheckCircle2, color: "text-success-foreground", labelKey: "eventCompleted" },
  CANCELLED:        { icon: XCircle,      color: "text-muted-foreground",   labelKey: "eventCancelled" },
  REDIRECTED:       { icon: RefreshCw,    color: "text-accent-foreground",  labelKey: "eventRedirected" },
  NOTE_ADDED:       { icon: MessageSquare,color: "text-primary",            labelKey: "eventNoteAdded" },
  ATTACHMENT_ADDED: { icon: Paperclip,    color: "text-primary",            labelKey: "eventAttachmentAdded" },
  EXPIRED:          { icon: AlertCircle,  color: "text-warning-foreground", labelKey: "eventCancelled" },
};

interface Props { referralId: string }

export function ActivityTimeline({ referralId }: Props) {
  const { t } = useI18n();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getReferralTimeline(referralId).then(({ data }) => {
      if (active) setEvents((data as TimelineEvent[]) ?? []);
    });
    return () => { active = false; };
  }, [referralId]);

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("activityTimeline")}
      </h3>

      {events === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="mt-0.5 h-7 w-7 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noTimelineEvents")}</p>
      ) : (
        <ol className="relative border-l border-border ps-5 space-y-4">
          {events.map((ev) => {
            const meta = EVENT_META[ev.event_type] ?? EVENT_META.CREATED;
            const Icon = meta.icon;
            return (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[22px] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card">
                  <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug">{t(meta.labelKey)}</p>
                  {ev.actor_name && (
                    <p className="text-[11px] text-muted-foreground">{ev.actor_name}</p>
                  )}
                  <time className="text-[11px] text-muted-foreground/70">
                    {new Date(ev.occurred_at).toLocaleString()}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
