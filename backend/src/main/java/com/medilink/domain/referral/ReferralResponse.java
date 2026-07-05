package com.medilink.domain.referral;

import com.medilink.domain.practitioner.PractitionerSpecialty;

import java.time.Instant;
import java.util.UUID;

public record ReferralResponse(
    UUID id,
    ReferralStatus status,
    UrgencyLevel urgency,
    PatientSummary patient,
    PractitionerSummary referringPractitioner,
    PractitionerSummary receivingPractitioner,
    PractitionerSpecialty requestedSpecialty,
    String reason,
    String clinicalNotes,
    String diagnosisCode,
    Instant sentAt,
    Instant expiresAt,
    Instant createdAt
) {

    public record PatientSummary(UUID id, String fullName, String nationalId) {}

    public record PractitionerSummary(UUID id, String fullName, PractitionerSpecialty specialty) {}

    public static ReferralResponse from(Referral r) {
        return new ReferralResponse(
            r.getId(),
            r.getStatus(),
            r.getUrgency(),
            new PatientSummary(
                r.getPatient().getId(),
                r.getPatient().getFullName(),
                r.getPatient().getNationalId()
            ),
            new PractitionerSummary(
                r.getReferringPractitioner().getId(),
                r.getReferringPractitioner().getUser().getFullName(),
                r.getReferringPractitioner().getSpecialty()
            ),
            r.getReceivingPractitioner() == null ? null : new PractitionerSummary(
                r.getReceivingPractitioner().getId(),
                r.getReceivingPractitioner().getUser().getFullName(),
                r.getReceivingPractitioner().getSpecialty()
            ),
            r.getRequestedSpecialty(),
            r.getReason(),
            r.getClinicalNotes(),
            r.getDiagnosisCode(),
            r.getSentAt(),
            r.getExpiresAt(),
            r.getCreatedAt()
        );
    }
}
