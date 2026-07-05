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

export function UploadReportDialog({
  referralId, open, onOpenChange, onUploaded, markCompleted,
}: { referralId: string; open: boolean; onOpenChange: (v: boolean) => void; onUploaded?: () => void; markCompleted?: boolean }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { toast.error(t("titleRequired")); return; }
    setSubmitting(true);
    const { error } = await api.createReport({
      referral_id: referralId, title, summary: summary || null, mark_completed: markCompleted ?? false,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("reportUploaded"));
    setTitle(""); setSummary(""); onOpenChange(false); onUploaded?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("uploadReportTitle")}</DialogTitle>
          <DialogDescription>{t("sendResult")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="rt">{t("reportTitle")}</Label>
            <Input id="rt" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rs">{t("summary")}</Label>
            <Textarea id="rs" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="rounded-lg border border-dashed border-border bg-surface p-3 text-xs text-muted-foreground">
            {t("fileUploadSoon")}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>{t("cancel")}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveReport")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
