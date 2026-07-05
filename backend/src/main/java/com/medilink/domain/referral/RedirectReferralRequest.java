package com.medilink.domain.referral;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record RedirectReferralRequest(
    @NotNull UUID newCenterId,
    @NotNull UUID newDoctorUserId
) {}
