package com.medilink.domain.referral;

public enum ReferralStatus {
    DRAFT,
    SENT,
    VIEWED,
    ACCEPTED,
    REJECTED,
    /** @deprecated use REJECTED instead */
    @Deprecated DECLINED,
    EXPIRED,
    SCHEDULED,
    REDIRECTED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    public boolean isTerminal() {
        return this == REJECTED || this == DECLINED || this == EXPIRED
            || this == COMPLETED || this == CANCELLED;
    }
}
