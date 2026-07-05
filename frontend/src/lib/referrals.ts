export type ReferralStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "redirected";

export type ReferralUrgency = "routine" | "urgent" | "emergency";

export const STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  redirected: "Redirected",
};

export const URGENCY_LABEL: Record<ReferralUrgency, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
};

export function statusClasses(status: ReferralStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "accepted":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "rejected":
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "scheduled":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "in_progress":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "expired":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "redirected":
      return "bg-teal-50 text-teal-700 border-teal-200";
  }
}

export function urgencyClasses(urgency: ReferralUrgency): string {
  switch (urgency) {
    case "routine":
      return "bg-slate-50 text-slate-700 border-slate-200";
    case "urgent":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "emergency":
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

export interface Referral {
  id: string;
  doctor_id: string;
  center_id: string;
  patient_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  patient_dob: string | null;
  specialty_needed: string | null;
  reason: string;
  clinical_notes: string | null;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  rejection_reason: string | null;
  redirected_to_referral_id: string | null;
  created_at: string;
  updated_at: string;
}
