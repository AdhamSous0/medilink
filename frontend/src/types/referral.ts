export type ReferralStatus =
  | "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED"
  | "EXPIRED" | "REDIRECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type UrgencyLevel = "ROUTINE" | "URGENT" | "EMERGENCY";

export type PractitionerSpecialty =
  | "GENERAL_PRACTICE" | "INTERNAL_MEDICINE" | "CARDIOLOGY" | "NEUROLOGY"
  | "ORTHOPEDICS" | "PEDIATRICS" | "OBSTETRICS_GYNECOLOGY" | "DERMATOLOGY"
  | "PSYCHIATRY" | "RADIOLOGY" | "PATHOLOGY" | "SURGERY" | "ONCOLOGY"
  | "ENDOCRINOLOGY" | "GASTROENTEROLOGY" | "PULMONOLOGY" | "NEPHROLOGY"
  | "UROLOGY" | "OPHTHALMOLOGY" | "ENT" | "OTHER";

export interface PatientSummary {
  id: string;
  fullName: string;
  nationalId: string | null;
}

export interface PractitionerSummary {
  id: string;
  fullName: string;
  specialty: PractitionerSpecialty;
}

export interface Referral {
  id: string;
  status: ReferralStatus;
  urgency: UrgencyLevel;
  patient: PatientSummary;
  referringPractitioner: PractitionerSummary;
  receivingPractitioner: PractitionerSummary | null;
  requestedSpecialty: PractitionerSpecialty | null;
  reason: string;
  clinicalNotes: string | null;
  diagnosisCode: string | null;
  sentAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateReferralRequest {
  patientId: string;
  receivingPractitionerId?: string;
  receivingCenterId?: string;
  requestedSpecialty?: PractitionerSpecialty;
  urgency: UrgencyLevel;
  reason: string;
  clinicalNotes?: string;
  diagnosisCode?: string;
  expiresAt?: string;
  send: boolean;
}
