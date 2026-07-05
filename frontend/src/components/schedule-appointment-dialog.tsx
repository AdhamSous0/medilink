import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ScheduleAppointmentDialog({
  referralId, open, onOpenChange, onScheduled,
}: { referralId: string; open: boolean; onOpenChange: (v: boolean) => void; onScheduled?: () => void }) {
  const { t } = useI18n();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) { toast.error(t("pickDateTime")); return; }
    setSubmitting(true);
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const { error } = await api.createAppointment({
      referral_id: referralId, scheduled_at: scheduledAt,
      duration_minutes: duration, location: location || null, notes: notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("appointmentScheduled"));
    onOpenChange(false); onScheduled?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("scheduleAppointment")}</DialogTitle>
          <DialogDescription>{t("setDateDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="d">{t("date")}</Label>
              <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t">{t("time")}</Label>
              <Input id="t" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dur">{t("durationMin")}</Label>
              <Input id="dur" type="number" min={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loc">{t("location")}</Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="n">{t("notes")}</Label>
            <Textarea id="n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>{t("cancel")}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("scheduleBtn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
