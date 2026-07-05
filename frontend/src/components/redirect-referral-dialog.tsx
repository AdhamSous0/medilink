import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Center = { id: string; organization_name: string | null; provider_type: string | null; address: string | null };

export function RedirectReferralDialog({
  referralId, currentCenterId, open, onOpenChange, onRedirected,
}: { referralId: string; currentCenterId: string; open: boolean; onOpenChange: (v: boolean) => void; onRedirected?: (newReferralId: string) => void }) {
  const { t } = useI18n();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [newCenterId, setNewCenterId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCenters(true); setNewCenterId(""); setNote("");
    api.getMedicalCenters().then(({ data, error }) => {
      if (error) toast.error(t("loadingCenters"));
      else setCenters(((data ?? []) as Center[]).filter((c) => c.id !== currentCenterId));
      setLoadingCenters(false);
    });
  }, [open, currentCenterId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCenterId) { toast.error(t("pickCenter")); return; }
    setSubmitting(true);
    const { data, error } = await api.redirectReferral(referralId, { new_center_id: newCenterId, note: note || null });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("referralRedirected"));
    onOpenChange(false);
    onRedirected?.((data as { newReferralId: string } | null)?.newReferralId ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("redirectReferralTitle")}</DialogTitle>
          <DialogDescription>{t("cantTake")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="new-center">{t("newCenter")}</Label>
            <Select value={newCenterId} onValueChange={setNewCenterId}>
              <SelectTrigger id="new-center">
                <SelectValue placeholder={loadingCenters ? t("loadingCenters") : t("selectCenter")} />
              </SelectTrigger>
              <SelectContent>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.organization_name ?? t("noCenters")}
                    {c.address ? ` — ${c.address}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">{t("reasonOptional")}</Label>
            <Textarea id="reason" rows={3} placeholder={t("reasonPlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>{t("cancel")}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("redirectBtn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
