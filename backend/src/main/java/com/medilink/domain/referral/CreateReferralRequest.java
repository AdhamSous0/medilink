package com.medilink.domain.referral;

import com.medilink.domain.practitioner.PractitionerSpecialty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Request body for creating a referral")
public record CreateReferralRequest(

    @NotNull(message = "patientId is required")
    @Schema(description = "ID of the patient being referred")
    UUID patientId,

    @Schema(description = "Target practitioner; null creates an open referral to a specialty")
    UUID receivingPractitionerId,

    @Schema(description = "Preferred receiving medical center")
    UUID receivingCenterId,

    @Schema(description = "Required when receivingPractitionerId is null")
    PractitionerSpecialty requestedSpecialty,

    @NotNull(message = "urgency is required")
    UrgencyLevel urgency,

    @NotBlank(message = "reason is required")
    @Schema(description = "Clinical reason for the referral")
    String reason,

    @Schema(description = "Additional clinical notes for the receiving practitioner")
    String clinicalNotes,

    @Schema(description = "ICD-10 diagnosis code")
    String diagnosisCode,

    @Schema(description = "Referral expiry; defaults to 30 days from now if not set")
    Instant expiresAt,

    @Schema(description = "When true, immediately transitions status from DRAFT to SENT")
    boolean send
) {}
