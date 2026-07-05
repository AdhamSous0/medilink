import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { id: string; referral_id: string; sender_id: string; body: string; created_at: string };

export function ReferralMessages({ referralId }: { referralId: string }) {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data, error } = await api.getMessages(referralId);
    if (error) { console.error(error); setMessages([]); return; }
    setMessages((data as Message[] | null) ?? []);
  }

  useEffect(() => {
    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    setSending(true);
    const { error } = await api.sendMessage({ referral_id: referralId, body: text });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody(""); void load();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="h-4 w-4 text-primary" />
        {t("conversation")}
      </h2>

      <div ref={scrollRef} className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
        {messages === null ? (
          <div className="grid place-items-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("noMessages")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
                  <div className={`mb-0.5 text-[10px] font-medium uppercase tracking-wider ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {mine ? t("you") : t("other")} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("writeMessage")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button type="submit" disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
}
