package com.medilink.domain.v3;

import java.util.Map;
import java.util.Set;

/** Allowed app_status transitions for the frontend API layer. */
public final class AppStatusMachine {

    private static final Map<String, Set<String>> ALLOWED = Map.of(
        "pending",     Set.of("accepted", "rejected", "cancelled", "scheduled"),
        "accepted",    Set.of("scheduled", "in_progress", "cancelled", "redirected"),
        "scheduled",   Set.of("in_progress", "cancelled", "redirected"),
        "in_progress", Set.of("completed", "redirected", "cancelled"),
        "rejected",    Set.of(),
        "completed",   Set.of(),
        "redirected",  Set.of(),
        "cancelled",   Set.of(),
        "expired",     Set.of()
    );

    private static final Set<String> VALID_STATUSES = Set.of(
        "pending","accepted","rejected","scheduled",
        "in_progress","completed","redirected","cancelled","expired"
    );

    private AppStatusMachine() {}

    public static boolean isValid(String status) {
        return status != null && VALID_STATUSES.contains(status);
    }

    public static boolean canTransition(String from, String to) {
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }
}
