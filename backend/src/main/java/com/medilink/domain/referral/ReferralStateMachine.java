package com.medilink.domain.referral;

import com.medilink.shared.exception.InvalidStateTransitionException;

import java.util.Map;
import java.util.Set;

public final class ReferralStateMachine {

    private static final Map<ReferralStatus, Set<ReferralStatus>> ALLOWED = Map.ofEntries(
        Map.entry(ReferralStatus.DRAFT,       Set.of(ReferralStatus.SENT, ReferralStatus.CANCELLED)),
        Map.entry(ReferralStatus.SENT,        Set.of(ReferralStatus.VIEWED, ReferralStatus.ACCEPTED, ReferralStatus.REJECTED, ReferralStatus.SCHEDULED, ReferralStatus.EXPIRED, ReferralStatus.CANCELLED)),
        Map.entry(ReferralStatus.VIEWED,      Set.of(ReferralStatus.ACCEPTED, ReferralStatus.REJECTED, ReferralStatus.SCHEDULED, ReferralStatus.EXPIRED, ReferralStatus.CANCELLED)),
        Map.entry(ReferralStatus.SCHEDULED,   Set.of(ReferralStatus.IN_PROGRESS, ReferralStatus.CANCELLED, ReferralStatus.EXPIRED)),
        Map.entry(ReferralStatus.ACCEPTED,    Set.of(ReferralStatus.IN_PROGRESS, ReferralStatus.CANCELLED)),
        Map.entry(ReferralStatus.IN_PROGRESS, Set.of(ReferralStatus.COMPLETED, ReferralStatus.REDIRECTED, ReferralStatus.CANCELLED)),
        Map.entry(ReferralStatus.REDIRECTED,  Set.of()),
        Map.entry(ReferralStatus.REJECTED,    Set.of()),
        Map.entry(ReferralStatus.DECLINED,    Set.of()),
        Map.entry(ReferralStatus.EXPIRED,     Set.of()),
        Map.entry(ReferralStatus.COMPLETED,   Set.of()),
        Map.entry(ReferralStatus.CANCELLED,   Set.of())
    );

    private ReferralStateMachine() {}

    public static void assertTransition(ReferralStatus from, ReferralStatus to) {
        if (!ALLOWED.getOrDefault(from, Set.of()).contains(to)) {
            throw new InvalidStateTransitionException(
                "Cannot transition referral from %s to %s".formatted(from, to));
        }
    }

    public static boolean canTransition(ReferralStatus from, ReferralStatus to) {
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }
}
