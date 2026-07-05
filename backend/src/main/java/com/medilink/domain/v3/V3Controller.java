package com.medilink.domain.v3;

import com.medilink.domain.user.User;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Frontend-compatible REST API layer.
 * Uses JDBC directly to serve the React frontend without touching the V1 JPA domain model.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "V3 API")
@SecurityRequirement(name = "bearerAuth")
public class V3Controller {

    private final JdbcTemplate jdbc;

    // ─── Medical Centers ────────────────────────────────────────────────────

    @GetMapping("/api/medical-centers")
    public ResponseEntity<List<Map<String, Object>>> listMedicalCenters(
        @RequestParam(required = false) String available
    ) {
        String sql = """
            SELECT u.id::text, p.organization_name, p.address, p.provider_type,
                   u.full_name, u.email, p.availability_status
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE u.role IN ('MEDICAL_CENTER','LAB_STAFF')
              AND u.is_active = true
            """;
        if ("true".equals(available)) {
            sql += " AND p.availability_status != 'unavailable'";
        }
        sql += " ORDER BY p.organization_name";
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    // ─── Referrals ──────────────────────────────────────────────────────────

    private static final String REFERRAL_SELECT = """
        SELECT r.id::text,
               r.doctor_id::text,
               r.center_id::text,
               r.patient_name,
               r.patient_phone,
               r.patient_dob::text AS patient_dob,
               r.specialty_needed,
               LOWER(r.urgency::text) AS urgency,
               r.reason,
               r.clinical_notes,
               r.rejection_reason,
               r.redirected_to_referral_id::text,
               r.app_status        AS status,
               r.created_at::text,
               r.updated_at::text,
               -- doctor profile
               dp.full_name        AS doctor_full_name,
               dp.email            AS doctor_email,
               dp.phone            AS doctor_phone,
               -- center profile
               cp.organization_name AS center_organization_name,
               cp.address           AS center_address
        FROM referrals r
        LEFT JOIN profiles dp ON dp.id = r.doctor_id
        LEFT JOIN profiles cp ON cp.id = r.center_id
        """;

    @GetMapping("/api/referrals")
    public ResponseEntity<List<Map<String, Object>>> listReferrals(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();

        List<Map<String, Object>> rows = switch (user.getRole()) {
            case DOCTOR -> jdbc.queryForList(
                REFERRAL_SELECT + " WHERE r.doctor_id = ?::uuid ORDER BY r.created_at DESC", uid);
            case MEDICAL_CENTER -> jdbc.queryForList(
                REFERRAL_SELECT + " WHERE r.center_id = ?::uuid ORDER BY r.created_at DESC", uid);
            default -> jdbc.queryForList(
                REFERRAL_SELECT + " WHERE r.doctor_id = ?::uuid OR r.center_id = ?::uuid ORDER BY r.created_at DESC", uid, uid);
        };

        return ResponseEntity.ok(rows.stream().map(this::nestReferralProfiles).toList());
    }

    @GetMapping("/api/referrals/{id}")
    public ResponseEntity<Map<String, Object>> getReferral(
        @PathVariable String id,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList(REFERRAL_SELECT + " WHERE r.id = ?::uuid", id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> row = rows.get(0);
        String uid = user.getId().toString();
        if (!uid.equals(String.valueOf(row.get("doctor_id")))
                && !uid.equals(String.valueOf(row.get("center_id")))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(nestReferralProfiles(row));
    }

    @PostMapping("/api/referrals")
    public ResponseEntity<Map<String, Object>> createReferral(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String centerId    = (String) body.get("center_id");
        String patientName = (String) body.get("patient_name");
        String reason      = (String) body.get("reason");
        if (centerId == null || centerId.isBlank()
                || patientName == null || patientName.isBlank()
                || reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String id = UUID.randomUUID().toString();
        String doctorId = user.getId().toString();
        String patientPhone   = (String) body.get("patient_phone");
        String patientDob     = (String) body.get("patient_dob");
        String specialtyNeeded = (String) body.get("specialty_needed");
        String urgency = body.getOrDefault("urgency", "ROUTINE").toString().toUpperCase();
        String clinicalNotes  = (String) body.get("clinical_notes");

        jdbc.update("""
            INSERT INTO referrals (id, doctor_id, center_id, patient_name, patient_phone,
                patient_dob, specialty_needed, urgency, reason, clinical_notes, app_status, status)
            VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?::date, ?, ?::urgency_level, ?, ?, 'pending', 'SENT')
            """,
            id, doctorId, centerId, patientName, patientPhone,
            patientDob, specialtyNeeded, urgency, reason, clinicalNotes
        );

        recordEvent(id, "CREATED", doctorId, null);

        var rows = jdbc.queryForList(REFERRAL_SELECT + " WHERE r.id = ?::uuid", id);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(nestReferralProfiles(rows.get(0)));
    }

    @PatchMapping("/api/referrals/{id}")
    public ResponseEntity<Map<String, Object>> updateReferral(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();

        var rows = jdbc.queryForList(REFERRAL_SELECT + " WHERE r.id = ?::uuid", id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> existing = rows.get(0);

        String uid = user.getId().toString();
        if (!uid.equals(String.valueOf(existing.get("doctor_id")))
                && !uid.equals(String.valueOf(existing.get("center_id")))) {
            return ResponseEntity.status(403).build();
        }

        String newStatus = (String) body.get("status");
        if (newStatus != null) {
            if (!AppStatusMachine.isValid(newStatus)) {
                return ResponseEntity.badRequest().build();
            }
            String currentStatus = (String) existing.get("status");
            if (!AppStatusMachine.canTransition(currentStatus, newStatus)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            String rejectionReason = (String) body.get("rejection_reason");
            jdbc.update("""
                UPDATE referrals
                SET app_status = ?, rejection_reason = ?, updated_at = NOW()
                WHERE id = ?::uuid
                """, newStatus, rejectionReason, id);

            // Map app_status to referral_event_type
            String eventType = switch (newStatus) {
                case "accepted"    -> "ACCEPTED";
                case "rejected"    -> "DECLINED";
                case "scheduled"   -> "VIEWED";
                case "in_progress" -> "STARTED";
                case "completed"   -> "COMPLETED";
                case "cancelled"   -> "CANCELLED";
                case "redirected"  -> "REDIRECTED";
                default            -> null;
            };
            if (eventType != null) {
                recordEvent(id, eventType, uid, rejectionReason != null
                    ? Map.of("reason", rejectionReason) : null);
            }
        }

        rows = jdbc.queryForList(REFERRAL_SELECT + " WHERE r.id = ?::uuid", id);
        return ResponseEntity.ok(nestReferralProfiles(rows.get(0)));
    }

    @PostMapping("/api/referrals/{id}/redirect")
    @Transactional
    public ResponseEntity<Map<String, Object>> redirectReferral(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();

        var orig = jdbc.queryForList("SELECT * FROM referrals WHERE id = ?::uuid", id);
        if (orig.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> r = orig.get(0);

        String newId = UUID.randomUUID().toString();
        String newCenterId = (String) body.get("new_center_id");

        jdbc.update("""
            INSERT INTO referrals (id, doctor_id, center_id, patient_name, patient_phone,
                patient_dob, specialty_needed, urgency, reason, clinical_notes, app_status, status)
            VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?::date, ?, ?::urgency_level, ?, ?, 'pending', 'SENT')
            """,
            newId,
            r.get("doctor_id") != null ? r.get("doctor_id").toString() : user.getId().toString(),
            newCenterId,
            r.get("patient_name"), r.get("patient_phone"), r.get("patient_dob"),
            r.get("specialty_needed"), r.get("urgency"), r.get("reason"), r.get("clinical_notes")
        );

        jdbc.update("""
            UPDATE referrals
            SET app_status = 'redirected',
                redirected_to_referral_id = ?::uuid,
                updated_at = NOW()
            WHERE id = ?::uuid
            """, newId, id);

        recordEvent(id, "REDIRECTED", user.getId().toString(),
            Map.of("new_referral_id", newId));
        recordEvent(newId, "CREATED", user.getId().toString(), null);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("newReferralId", newId));
    }

    // ─── Activity Timeline ──────────────────────────────────────────────────

    @GetMapping("/api/referrals/{id}/timeline")
    public ResponseEntity<List<Map<String, Object>>> getReferralTimeline(
        @PathVariable String id,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();

        // Verify access
        var check = jdbc.queryForList(
            "SELECT doctor_id::text, center_id::text FROM referrals WHERE id = ?::uuid", id);
        if (check.isEmpty()) return ResponseEntity.notFound().build();
        String uid = user.getId().toString();
        Map<String, Object> r = check.get(0);
        if (!uid.equals(String.valueOf(r.get("doctor_id")))
                && !uid.equals(String.valueOf(r.get("center_id")))) {
            return ResponseEntity.status(403).build();
        }

        var rows = jdbc.queryForList("""
            SELECT e.id::text, e.referral_id::text, e.event_type::text,
                   e.actor_id::text, e.payload::text AS payload,
                   e.occurred_at::text,
                   u.full_name AS actor_name, u.role::text AS actor_role
            FROM referral_events e
            LEFT JOIN users u ON u.id = e.actor_id
            WHERE e.referral_id = ?::uuid
            ORDER BY e.occurred_at ASC
            """, id);
        return ResponseEntity.ok(rows);
    }

    // ─── Appointments ───────────────────────────────────────────────────────

    @GetMapping("/api/appointments")
    public ResponseEntity<List<Map<String, Object>>> listAppointments(
        @RequestParam(required = false) String referral_id,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();

        if (referral_id != null) {
            var rows = jdbc.queryForList("""
                SELECT a.id::text, a.referral_id::text, a.scheduled_at::text,
                       a.duration_minutes, a.location, a.notes, a.created_at::text,
                       r.patient_name, r.specialty_needed,
                       cp.organization_name AS center_organization_name,
                       dp.full_name         AS doctor_full_name
                FROM appointments a
                JOIN referrals r ON r.id = a.referral_id
                LEFT JOIN profiles cp ON cp.id = r.center_id
                LEFT JOIN profiles dp ON dp.id = r.doctor_id
                WHERE a.referral_id = ?::uuid
                ORDER BY a.scheduled_at
                """, referral_id);
            return ResponseEntity.ok(rows);
        }

        var rows = jdbc.queryForList("""
            SELECT a.id::text, a.referral_id::text, a.scheduled_at::text,
                   a.duration_minutes, a.location, a.notes, a.created_at::text,
                   r.patient_name, r.specialty_needed,
                   cp.organization_name AS center_organization_name,
                   dp.full_name         AS doctor_full_name
            FROM appointments a
            JOIN referrals r ON r.id = a.referral_id
            LEFT JOIN profiles cp ON cp.id = r.center_id
            LEFT JOIN profiles dp ON dp.id = r.doctor_id
            WHERE r.doctor_id = ?::uuid OR r.center_id = ?::uuid
            ORDER BY a.scheduled_at
            """, uid, uid);
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/appointments")
    public ResponseEntity<Map<String, Object>> createAppointment(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO appointments (id, referral_id, scheduled_at, duration_minutes, location, notes, created_by)
            VALUES (?::uuid, ?::uuid, ?::timestamptz, ?, ?, ?, ?::uuid)
            """,
            id,
            (String) body.get("referral_id"),
            (String) body.get("scheduled_at"),
            body.getOrDefault("duration_minutes", 30),
            body.get("location"),
            body.get("notes"),
            user.getId().toString()
        );
        String referralId = (String) body.get("referral_id");
        jdbc.update("UPDATE referrals SET app_status = 'scheduled', updated_at = NOW() WHERE id = ?::uuid", referralId);
        recordEvent(referralId, "VIEWED", user.getId().toString(), null);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    @GetMapping("/api/messages")
    public ResponseEntity<List<Map<String, Object>>> listMessages(
        @RequestParam String referral_id,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();
        var ref = jdbc.queryForList(
            "SELECT doctor_id::text, center_id::text FROM referrals WHERE id = ?::uuid", referral_id);
        if (ref.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> r = ref.get(0);
        if (!uid.equals(String.valueOf(r.get("doctor_id")))
                && !uid.equals(String.valueOf(r.get("center_id")))) {
            return ResponseEntity.status(403).build();
        }
        var rows = jdbc.queryForList("""
            SELECT m.id::text, m.referral_id::text, m.sender_id::text, m.body, m.created_at::text
            FROM referral_messages m
            WHERE m.referral_id = ?::uuid
            ORDER BY m.created_at
            """, referral_id);
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO referral_messages (id, referral_id, sender_id, body)
            VALUES (?::uuid, ?::uuid, ?::uuid, ?)
            """,
            id,
            (String) body.get("referral_id"),
            user.getId().toString(),
            (String) body.get("body")
        );
        recordEvent((String) body.get("referral_id"), "NOTE_ADDED", user.getId().toString(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    // ─── Reports ─────────────────────────────────────────────────────────────

    @GetMapping("/api/reports")
    public ResponseEntity<List<Map<String, Object>>> listReports(@RequestParam String referral_id) {
        var rows = jdbc.queryForList("""
            SELECT id::text, referral_id::text, uploaded_by::text,
                   title, summary, storage_path, mime_type, size_bytes, created_at::text, updated_at::text
            FROM reports
            WHERE referral_id = ?::uuid
            ORDER BY created_at DESC
            """, referral_id);
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/reports")
    public ResponseEntity<Map<String, Object>> createReport(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO reports (id, referral_id, uploaded_by, title, summary)
            VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?)
            """,
            id,
            (String) body.get("referral_id"),
            user.getId().toString(),
            (String) body.get("title"),
            (String) body.get("summary")
        );
        Boolean markCompleted = (Boolean) body.get("mark_completed");
        if (Boolean.TRUE.equals(markCompleted)) {
            jdbc.update("UPDATE referrals SET app_status = 'completed', updated_at = NOW() WHERE id = ?::uuid",
                body.get("referral_id"));
            recordEvent((String) body.get("referral_id"), "COMPLETED", user.getId().toString(), null);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    // ─── Attachments ─────────────────────────────────────────────────────────

    @GetMapping("/api/attachments")
    public ResponseEntity<List<Map<String, Object>>> listAttachments(@RequestParam String referral_id) {
        var rows = jdbc.queryForList("""
            SELECT id::text, referral_id::text, uploaded_by::text,
                   label, storage_path, mime_type, size_bytes, created_at::text
            FROM referral_attachments
            WHERE referral_id = ?::uuid
            ORDER BY created_at DESC
            """, referral_id);
        return ResponseEntity.ok(rows);
    }

    // ─── Notifications ───────────────────────────────────────────────────────

    @GetMapping("/api/notifications")
    public ResponseEntity<List<Map<String, Object>>> listNotifications(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList("""
            SELECT id::text, user_id::text, type, title, message, link, read, created_at::text
            FROM notifications
            WHERE user_id = ?::uuid
            ORDER BY created_at DESC
            """, user.getId().toString());
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/api/notifications/unread-count")
    public ResponseEntity<Map<String, Object>> unreadCount(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ?::uuid AND read = false",
            Integer.class, user.getId().toString());
        return ResponseEntity.ok(Map.of("count", count != null ? count : 0));
    }

    @PatchMapping("/api/notifications/{id}")
    public ResponseEntity<Void> updateNotification(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        Boolean read = (Boolean) body.get("read");
        if (Boolean.TRUE.equals(read)) {
            jdbc.update("UPDATE notifications SET read = true WHERE id = ?::uuid AND user_id = ?::uuid",
                id, user.getId().toString());
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(
        @PathVariable String id,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        jdbc.update("DELETE FROM notifications WHERE id = ?::uuid AND user_id = ?::uuid",
            id, user.getId().toString());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/notifications/mark-all-read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        jdbc.update("UPDATE notifications SET read = true WHERE user_id = ?::uuid AND read = false",
            user.getId().toString());
        return ResponseEntity.ok().build();
    }

    // ─── Analytics ───────────────────────────────────────────────────────────

    @GetMapping("/api/analytics/dashboard")
    public ResponseEntity<Map<String, Object>> dashboardAnalytics(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();
        Map<String, Object> result = new HashMap<>();

        switch (user.getRole()) {
            case DOCTOR -> {
                // Referrals by status
                var byStatus = jdbc.queryForList("""
                    SELECT app_status AS status, COUNT(*)::int AS count
                    FROM referrals WHERE doctor_id = ?::uuid
                    GROUP BY app_status
                    """, uid);
                result.put("referralsByStatus", byStatus);

                // Unique patient count
                Integer patients = jdbc.queryForObject(
                    "SELECT COUNT(DISTINCT patient_name) FROM referrals WHERE doctor_id = ?::uuid",
                    Integer.class, uid);
                result.put("totalPatients", patients != null ? patients : 0);

                // Last 7 days daily referral count
                var daily = jdbc.queryForList("""
                    SELECT DATE(created_at) AS day, COUNT(*)::int AS count
                    FROM referrals
                    WHERE doctor_id = ?::uuid
                      AND created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY day ORDER BY day
                    """, uid);
                result.put("dailyReferrals", daily);
            }
            case MEDICAL_CENTER -> {
                var byStatus = jdbc.queryForList("""
                    SELECT app_status AS status, COUNT(*)::int AS count
                    FROM referrals WHERE center_id = ?::uuid
                    GROUP BY app_status
                    """, uid);
                result.put("referralsByStatus", byStatus);

                Integer doctors = jdbc.queryForObject(
                    "SELECT COUNT(DISTINCT doctor_id) FROM referrals WHERE center_id = ?::uuid",
                    Integer.class, uid);
                result.put("totalDoctors", doctors != null ? doctors : 0);

                var daily = jdbc.queryForList("""
                    SELECT DATE(created_at) AS day, COUNT(*)::int AS count
                    FROM referrals
                    WHERE center_id = ?::uuid
                      AND created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY day ORDER BY day
                    """, uid);
                result.put("dailyReferrals", daily);
            }
            case LAB_STAFF -> {
                var pending = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM lab_requests WHERE lab_user_id = ?::uuid AND status = 'pending'",
                    Integer.class, uid);
                result.put("pendingRequests", pending != null ? pending : 0);

                var completed = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM lab_requests WHERE lab_user_id = ?::uuid AND status = 'completed'",
                    Integer.class, uid);
                result.put("completedRequests", completed != null ? completed : 0);
            }
            default -> result.put("message", "No analytics for this role yet.");
        }

        return ResponseEntity.ok(result);
    }

    // ─── Global Search ────────────────────────────────────────────────────────

    @GetMapping("/api/search")
    public ResponseEntity<Map<String, Object>> search(
        @RequestParam String q,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        if (q == null || q.isBlank()) return ResponseEntity.ok(Map.of("referrals", List.of(), "patients", List.of()));

        String uid = user.getId().toString();
        String pattern = "%" + q.toLowerCase() + "%";

        var referrals = jdbc.queryForList("""
            SELECT r.id::text, r.patient_name, r.reason, r.app_status AS status, r.created_at::text
            FROM referrals r
            WHERE (r.doctor_id = ?::uuid OR r.center_id = ?::uuid)
              AND (LOWER(r.patient_name) LIKE ? OR LOWER(r.reason) LIKE ? OR LOWER(r.specialty_needed) LIKE ?)
            ORDER BY r.created_at DESC
            LIMIT 10
            """, uid, uid, pattern, pattern, pattern);

        var patients = jdbc.queryForList("""
            SELECT DISTINCT r.patient_name, r.patient_phone, COUNT(*)::int AS referral_count
            FROM referrals r
            WHERE r.doctor_id = ?::uuid
              AND LOWER(r.patient_name) LIKE ?
            GROUP BY r.patient_name, r.patient_phone
            LIMIT 5
            """, uid, pattern);

        return ResponseEntity.ok(Map.of("referrals", referrals, "patients", patients));
    }

    // ─── Availability ─────────────────────────────────────────────────────────

    @GetMapping("/api/availability/me")
    public ResponseEntity<Map<String, Object>> getMyAvailability(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList(
            "SELECT availability_status FROM profiles WHERE id = ?::uuid",
            user.getId().toString());
        if (rows.isEmpty()) return ResponseEntity.ok(Map.of("availability_status", "available"));
        return ResponseEntity.ok(rows.get(0));
    }

    @PatchMapping("/api/availability/me")
    public ResponseEntity<Map<String, Object>> updateAvailability(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String status = (String) body.get("availability_status");
        if (status == null) return ResponseEntity.badRequest().build();
        jdbc.update("UPDATE profiles SET availability_status = ?, updated_at = NOW() WHERE id = ?::uuid",
            status, user.getId().toString());
        return ResponseEntity.ok(Map.of("availability_status", status));
    }

    // ─── Lab Requests ─────────────────────────────────────────────────────────

    @GetMapping("/api/lab/requests")
    public ResponseEntity<List<Map<String, Object>>> listLabRequests(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();

        List<Map<String, Object>> rows;
        if (user.getRole().name().equals("LAB_STAFF")) {
            rows = jdbc.queryForList("""
                SELECT lr.id::text, lr.referral_id::text, lr.test_type, lr.notes,
                       lr.status, lr.created_at::text,
                       r.patient_name, r.reason,
                       u.full_name AS requested_by_name
                FROM lab_requests lr
                JOIN referrals r ON r.id = lr.referral_id
                LEFT JOIN users u ON u.id = lr.requested_by
                WHERE lr.lab_user_id = ?::uuid
                ORDER BY lr.created_at DESC
                """, uid);
        } else {
            rows = jdbc.queryForList("""
                SELECT lr.id::text, lr.referral_id::text, lr.test_type, lr.notes,
                       lr.status, lr.created_at::text,
                       r.patient_name, r.reason,
                       u.full_name AS lab_name
                FROM lab_requests lr
                JOIN referrals r ON r.id = lr.referral_id
                LEFT JOIN users u ON u.id = lr.lab_user_id
                WHERE lr.requested_by = ?::uuid
                ORDER BY lr.created_at DESC
                """, uid);
        }
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/lab/requests")
    public ResponseEntity<Map<String, Object>> createLabRequest(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO lab_requests (id, referral_id, requested_by, lab_user_id, test_type, notes)
            VALUES (?::uuid, ?::uuid, ?::uuid, ?::uuid, ?, ?)
            """,
            id,
            (String) body.get("referral_id"),
            user.getId().toString(),
            (String) body.get("lab_user_id"),
            (String) body.get("test_type"),
            body.get("notes")
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    @PatchMapping("/api/lab/requests/{id}")
    public ResponseEntity<Map<String, Object>> updateLabRequest(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String status = (String) body.get("status");
        if (status != null) {
            jdbc.update("UPDATE lab_requests SET status = ?, updated_at = NOW() WHERE id = ?::uuid",
                status, id);
        }

        // If submitting results
        String findings = (String) body.get("findings");
        if (findings != null && !findings.isBlank()) {
            jdbc.update("""
                INSERT INTO lab_results (id, lab_request_id, submitted_by, findings)
                VALUES (?::uuid, ?::uuid, ?::uuid, ?)
                """,
                UUID.randomUUID().toString(), id, user.getId().toString(), findings
            );
            jdbc.update("UPDATE lab_requests SET status = 'completed', updated_at = NOW() WHERE id = ?::uuid", id);
        }

        return ResponseEntity.ok(Map.of("id", id));
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/users")
    public ResponseEntity<List<Map<String, Object>>> listUsers(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (user.getRole().name().equals("ADMIN") == false) return ResponseEntity.status(403).build();

        var rows = jdbc.queryForList("""
            SELECT u.id::text, u.email, u.full_name, u.role::text, u.is_active,
                   u.created_at::text, p.organization_name, p.specialty
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            ORDER BY u.created_at DESC
            """);
        return ResponseEntity.ok(rows);
    }

    @PatchMapping("/api/admin/users/{id}")
    public ResponseEntity<Void> updateUser(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        if (!user.getRole().name().equals("ADMIN")) return ResponseEntity.status(403).build();

        Boolean isActive = (Boolean) body.get("is_active");
        if (isActive != null) {
            jdbc.update("UPDATE users SET is_active = ? WHERE id = ?::uuid", isActive, id);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/admin/stats")
    public ResponseEntity<Map<String, Object>> adminStats(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (!user.getRole().name().equals("ADMIN")) return ResponseEntity.status(403).build();

        Integer totalUsers = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        Integer totalReferrals = jdbc.queryForObject("SELECT COUNT(*) FROM referrals", Integer.class);
        Integer totalDoctors = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role = 'DOCTOR'", Integer.class);
        Integer totalCenters = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role = 'MEDICAL_CENTER'", Integer.class);

        return ResponseEntity.ok(Map.of(
            "totalUsers", totalUsers != null ? totalUsers : 0,
            "totalReferrals", totalReferrals != null ? totalReferrals : 0,
            "totalDoctors", totalDoctors != null ? totalDoctors : 0,
            "totalCenters", totalCenters != null ? totalCenters : 0
        ));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void recordEvent(String referralId, String eventType, String actorId, Object payload) {
        try {
            String payloadJson = payload != null
                ? new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload)
                : null;
            jdbc.update("""
                INSERT INTO referral_events (id, referral_id, event_type, actor_id, payload)
                VALUES (?::uuid, ?::uuid, ?::referral_event_type, ?::uuid, ?::jsonb)
                """,
                UUID.randomUUID().toString(), referralId, eventType, actorId, payloadJson);
        } catch (Exception ignored) {
            // Non-critical — don't fail the main operation if event recording fails
        }
    }

    // ─── Directory ───────────────────────────────────────────────────────────

    private static final String DIRECTORY_SELECT = """
        SELECT u.id::text, u.email, u.full_name, u.role::text,
               p.organization_name, p.specialty, p.city, p.address, p.phone,
               p.bio, p.years_exp, p.services, p.working_hours, p.website,
               p.avatar_url, p.availability_status, p.provider_type, p.rating
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        WHERE u.is_active = true
        """;

    @GetMapping("/api/directory/doctors")
    public ResponseEntity<List<Map<String, Object>>> listDoctors(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String specialty,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String availability
    ) {
        StringBuilder sql = new StringBuilder(DIRECTORY_SELECT + " AND u.role = 'DOCTOR'");
        List<Object> params = new java.util.ArrayList<>();
        if (specialty != null && !specialty.isBlank()) { sql.append(" AND LOWER(p.specialty) LIKE LOWER(?)"); params.add("%" + specialty + "%"); }
        if (city != null && !city.isBlank()) { sql.append(" AND LOWER(p.city) LIKE LOWER(?)"); params.add("%" + city + "%"); }
        if (availability != null && !availability.isBlank()) { sql.append(" AND p.availability_status = ?"); params.add(availability); }
        if (q != null && !q.isBlank()) { sql.append(" AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(p.specialty) LIKE LOWER(?))"); params.add("%" + q + "%"); params.add("%" + q + "%"); }
        sql.append(" ORDER BY u.full_name");
        return ResponseEntity.ok(jdbc.queryForList(sql.toString(), params.toArray()));
    }

    @GetMapping("/api/directory/doctors/{id}")
    public ResponseEntity<Map<String, Object>> getDoctor(@PathVariable String id) {
        var rows = jdbc.queryForList(DIRECTORY_SELECT + " AND u.id = ?::uuid", id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @GetMapping("/api/directory/centers")
    public ResponseEntity<List<Map<String, Object>>> listCenters(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String availability,
        @RequestParam(required = false) String service
    ) {
        StringBuilder sql = new StringBuilder(DIRECTORY_SELECT + " AND u.role = 'MEDICAL_CENTER'");
        List<Object> params = new java.util.ArrayList<>();
        if (city != null && !city.isBlank()) { sql.append(" AND LOWER(p.city) LIKE LOWER(?)"); params.add("%" + city + "%"); }
        if (availability != null && !availability.isBlank()) { sql.append(" AND p.availability_status = ?"); params.add(availability); }
        if (service != null && !service.isBlank()) { sql.append(" AND ? = ANY(p.services)"); params.add(service); }
        if (q != null && !q.isBlank()) { sql.append(" AND (LOWER(p.organization_name) LIKE LOWER(?) OR LOWER(p.city) LIKE LOWER(?))"); params.add("%" + q + "%"); params.add("%" + q + "%"); }
        sql.append(" ORDER BY p.organization_name");
        return ResponseEntity.ok(jdbc.queryForList(sql.toString(), params.toArray()));
    }

    @GetMapping("/api/directory/centers/{id}")
    public ResponseEntity<Map<String, Object>> getCenter(@PathVariable String id) {
        var rows = jdbc.queryForList(DIRECTORY_SELECT + " AND u.id = ?::uuid AND u.role = 'MEDICAL_CENTER'", id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        var row = new HashMap<>(rows.get(0));
        // Include equipment
        var equipment = jdbc.queryForList("SELECT id::text, name, status, notes FROM equipment WHERE owner_id = ?::uuid ORDER BY name", id);
        row.put("equipment", equipment);
        // Include affiliated doctors (accepted invitations) with their schedule
        var doctors = jdbc.queryForList("""
            SELECT di.id::text AS invitation_id,
                   u.id::text, u.full_name, u.email,
                   p.specialty, p.avatar_url, p.availability_status, p.phone
            FROM doctor_invitations di
            JOIN users u ON u.id = di.doctor_id
            LEFT JOIN profiles p ON p.id = u.id
            WHERE di.center_id = ?::uuid AND di.status = 'accepted'
            ORDER BY u.full_name
            """, id);
        // Attach schedule per doctor
        for (var doc : doctors) {
            String invId = (String) doc.get("invitation_id");
            var schedule = jdbc.queryForList("""
                SELECT id::text, day_of_week, start_time::text, end_time::text, notes
                FROM doctor_schedules
                WHERE center_id = ?::uuid AND doctor_id = ?::uuid
                ORDER BY day_of_week, start_time
                """, id, doc.get("id"));
            ((HashMap<String, Object>) doc).put("schedule", schedule);
        }
        row.put("doctors", doctors);
        return ResponseEntity.ok(row);
    }

    @GetMapping("/api/directory/centers/{id}/doctors")
    public ResponseEntity<List<Map<String, Object>>> getCenterDoctors(@PathVariable String id) {
        var doctors = jdbc.queryForList("""
            SELECT DISTINCT u.id::text, u.full_name, u.email,
                            p.specialty, p.city, p.avatar_url, p.availability_status,
                            p.bio, p.years_exp,
                            COUNT(r.id) OVER (PARTITION BY u.id)::int AS referral_count
            FROM referrals r
            JOIN users u ON u.id = r.doctor_id
            LEFT JOIN profiles p ON p.id = u.id
            WHERE r.center_id = ?::uuid
            ORDER BY referral_count DESC
            """, id);
        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/api/directory/labs")
    public ResponseEntity<List<Map<String, Object>>> listLabs(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String availability
    ) {
        StringBuilder sql = new StringBuilder(DIRECTORY_SELECT + " AND u.role = 'LAB_STAFF'");
        List<Object> params = new java.util.ArrayList<>();
        if (city != null && !city.isBlank()) { sql.append(" AND LOWER(p.city) LIKE LOWER(?)"); params.add("%" + city + "%"); }
        if (availability != null && !availability.isBlank()) { sql.append(" AND p.availability_status = ?"); params.add(availability); }
        if (q != null && !q.isBlank()) { sql.append(" AND (LOWER(p.organization_name) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?))"); params.add("%" + q + "%"); params.add("%" + q + "%"); }
        sql.append(" ORDER BY COALESCE(p.organization_name, u.full_name)");
        return ResponseEntity.ok(jdbc.queryForList(sql.toString(), params.toArray()));
    }

    // ─── Doctor Invitations ───────────────────────────────────────────────────

    @PostMapping("/api/directory/centers/{centerId}/invite")
    public ResponseEntity<Map<String, Object>> inviteDoctor(
        @PathVariable String centerId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        if (!user.getId().toString().equals(centerId)) return ResponseEntity.status(403).build();

        String doctorId = (String) body.get("doctor_id");
        String message  = (String) body.getOrDefault("message", "");
        if (doctorId == null) return ResponseEntity.badRequest().body(Map.of("error", "doctor_id required"));

        // Get center name
        var centerName = jdbc.queryForList(
            "SELECT COALESCE(p.organization_name, u.full_name) AS name FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = ?::uuid",
            centerId
        );
        String cName = centerName.isEmpty() ? "المركز" : (String) centerName.get(0).get("name");

        String id = UUID.randomUUID().toString();
        try {
            jdbc.update("""
                INSERT INTO doctor_invitations (id, center_id, doctor_id, status, message)
                VALUES (?::uuid, ?::uuid, ?::uuid, 'pending', ?)
                ON CONFLICT (center_id, doctor_id) DO UPDATE SET status = 'pending', message = EXCLUDED.message, updated_at = NOW()
                """, id, centerId, doctorId, message);
        } catch (Exception e) {
            return ResponseEntity.status(409).body(Map.of("error", "Already invited"));
        }

        // Send notification to doctor
        jdbc.update("""
            INSERT INTO notifications (id, user_id, type, title, message, link)
            VALUES (?::uuid, ?::uuid, 'invitation', ?, ?, ?)
            """,
            UUID.randomUUID().toString(), doctorId,
            "طلب انضمام إلى مركز طبي",
            "يدعوك " + cName + " للانضمام كطبيب متعاون" + (message != null && !message.isBlank() ? ": " + message : ""),
            "/invitations"
        );

        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @GetMapping("/api/invitations")
    public ResponseEntity<List<Map<String, Object>>> getMyInvitations(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList("""
            SELECT di.id::text, di.status, di.message, di.created_at::text,
                   u.id::text AS center_id,
                   COALESCE(p.organization_name, u.full_name) AS center_name,
                   p.avatar_url, p.city, p.availability_status
            FROM doctor_invitations di
            JOIN users u ON u.id = di.center_id
            LEFT JOIN profiles p ON p.id = u.id
            WHERE di.doctor_id = ?::uuid
            ORDER BY di.created_at DESC
            """, user.getId().toString());
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/api/invitations/sent")
    public ResponseEntity<List<Map<String, Object>>> getSentInvitations(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList("""
            SELECT di.id::text, di.status, di.message, di.created_at::text,
                   u.id::text AS doctor_id,
                   u.full_name AS doctor_name, u.email AS doctor_email,
                   p.specialty, p.avatar_url, p.availability_status
            FROM doctor_invitations di
            JOIN users u ON u.id = di.doctor_id
            LEFT JOIN profiles p ON p.id = u.id
            WHERE di.center_id = ?::uuid
            ORDER BY di.created_at DESC
            """, user.getId().toString());
        return ResponseEntity.ok(rows);
    }

    @PatchMapping("/api/invitations/{id}")
    public ResponseEntity<Void> respondToInvitation(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String status = (String) body.get("status"); // accepted or rejected
        if (status == null || (!status.equals("accepted") && !status.equals("rejected")))
            return ResponseEntity.badRequest().build();

        // Verify the invitation belongs to this doctor
        var rows = jdbc.queryForList(
            "SELECT center_id::text FROM doctor_invitations WHERE id = ?::uuid AND doctor_id = ?::uuid",
            id, user.getId().toString());
        if (rows.isEmpty()) return ResponseEntity.status(403).build();

        jdbc.update("UPDATE doctor_invitations SET status = ?, updated_at = NOW() WHERE id = ?::uuid", status, id);

        // Notify the center
        String centerId = (String) rows.get(0).get("center_id");
        var doctorName = jdbc.queryForList("SELECT full_name FROM users WHERE id = ?::uuid", user.getId().toString());
        String dName = doctorName.isEmpty() ? "الطبيب" : (String) doctorName.get(0).get("full_name");
        String notifMsg = status.equals("accepted")
            ? "قبل " + dName + " دعوة الانضمام إلى مركزك"
            : "رفض " + dName + " دعوة الانضمام إلى مركزك";

        jdbc.update("""
            INSERT INTO notifications (id, user_id, type, title, message, link)
            VALUES (?::uuid, ?::uuid, 'invitation_response', ?, ?, ?)
            """,
            UUID.randomUUID().toString(), centerId,
            status.equals("accepted") ? "تم قبول الدعوة ✅" : "تم رفض الدعوة",
            notifMsg, "/directory"
        );

        return ResponseEntity.ok().build();
    }

    // ─── Affiliations (accepted invitations) ──────────────────────────────────

    /** List active affiliations for the current user.
     *  Doctor  → returns centers they are affiliated with (+ schedule).
     *  Center  → returns doctors affiliated with them (+ schedule). */
    @GetMapping("/api/affiliations")
    public ResponseEntity<List<Map<String, Object>>> getAffiliations(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();

        // Determine role from users table
        var roleRow = jdbc.queryForList("SELECT role FROM users WHERE id = ?::uuid", user.getId().toString());
        if (roleRow.isEmpty()) return ResponseEntity.status(404).build();
        String role = (String) roleRow.get(0).get("role");

        List<Map<String, Object>> rows;
        if ("MEDICAL_CENTER".equals(role) || "LAB_STAFF".equals(role)) {
            // Return affiliated doctors
            rows = jdbc.queryForList("""
                SELECT di.id::text AS invitation_id, di.created_at::text AS since,
                       u.id::text AS doctor_id, u.full_name AS doctor_name, u.email AS doctor_email,
                       p.specialty, p.avatar_url, p.availability_status, p.phone
                FROM doctor_invitations di
                JOIN users u ON u.id = di.doctor_id
                LEFT JOIN profiles p ON p.id = u.id
                WHERE di.center_id = ?::uuid AND di.status = 'accepted'
                ORDER BY di.updated_at DESC
                """, user.getId().toString());
        } else {
            // Return affiliated centers
            rows = jdbc.queryForList("""
                SELECT di.id::text AS invitation_id, di.created_at::text AS since,
                       u.id::text AS center_id,
                       COALESCE(p.organization_name, u.full_name) AS center_name,
                       u.email AS center_email,
                       p.city, p.avatar_url, p.availability_status, p.phone, p.working_hours
                FROM doctor_invitations di
                JOIN users u ON u.id = di.center_id
                LEFT JOIN profiles p ON p.id = u.id
                WHERE di.doctor_id = ?::uuid AND di.status = 'accepted'
                ORDER BY di.updated_at DESC
                """, user.getId().toString());
        }

        // Attach schedule to each affiliation
        for (var row : rows) {
            String invId = (String) row.get("invitation_id");
            var schedule = jdbc.queryForList("""
                SELECT id::text, day_of_week, start_time::text, end_time::text, notes
                FROM doctor_schedules
                WHERE center_id = (SELECT center_id FROM doctor_invitations WHERE id = ?::uuid)
                  AND doctor_id = (SELECT doctor_id FROM doctor_invitations WHERE id = ?::uuid)
                ORDER BY day_of_week, start_time
                """, invId, invId);
            row.put("schedule", schedule);
        }

        return ResponseEntity.ok(rows);
    }

    /** Cancel an active affiliation — available to both doctor and center. */
    @PatchMapping("/api/affiliations/{invitationId}/cancel")
    public ResponseEntity<Void> cancelAffiliation(
        @PathVariable String invitationId,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();

        // Verify current user is part of this affiliation
        var rows = jdbc.queryForList("""
            SELECT center_id::text, doctor_id::text FROM doctor_invitations
            WHERE id = ?::uuid AND status = 'accepted'
              AND (center_id = ?::uuid OR doctor_id = ?::uuid)
            """, invitationId, uid, uid);
        if (rows.isEmpty()) return ResponseEntity.status(403).build();

        String centerId = (String) rows.get(0).get("center_id");
        String doctorId = (String) rows.get(0).get("doctor_id");
        boolean isCenterCancelling = uid.equals(centerId);

        jdbc.update("UPDATE doctor_invitations SET status='cancelled', updated_at=NOW() WHERE id=?::uuid", invitationId);

        // Notify the other party
        String actorName;
        var nameRow = jdbc.queryForList("SELECT full_name FROM users WHERE id=?::uuid", uid);
        actorName = nameRow.isEmpty() ? "أحد الأطراف" : (String) nameRow.get(0).get("full_name");

        String recipientId = isCenterCancelling ? doctorId : centerId;
        String title = "تم إنهاء الارتباط";
        String msg = (isCenterCancelling ? "قام المركز" : "الدكتور") + " " + actorName + " بإنهاء الارتباط";

        jdbc.update("""
            INSERT INTO notifications (id, user_id, type, title, message, link)
            VALUES (?::uuid, ?::uuid, 'affiliation_cancelled', ?, ?, '/affiliations')
            """, UUID.randomUUID().toString(), recipientId, title, msg);

        return ResponseEntity.ok().build();
    }

    // ─── Doctor Schedules ──────────────────────────────────────────────────────

    /** Center adds a schedule slot for an affiliated doctor. */
    @PostMapping("/api/affiliations/{invitationId}/schedule")
    public ResponseEntity<Map<String, Object>> addSchedule(
        @PathVariable String invitationId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();

        // Only center can add schedule
        var inv = jdbc.queryForList("""
            SELECT center_id::text, doctor_id::text FROM doctor_invitations
            WHERE id = ?::uuid AND status = 'accepted' AND center_id = ?::uuid
            """, invitationId, user.getId().toString());
        if (inv.isEmpty()) return ResponseEntity.status(403).build();

        String centerId = (String) inv.get(0).get("center_id");
        String doctorId = (String) inv.get(0).get("doctor_id");

        int dayOfWeek = ((Number) body.get("day_of_week")).intValue();
        String startTime = (String) body.get("start_time");
        String endTime = (String) body.get("end_time");
        String notes = (String) body.getOrDefault("notes", null);

        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO doctor_schedules (id, center_id, doctor_id, day_of_week, start_time, end_time, notes)
            VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?::time, ?::time, ?)
            """, id, centerId, doctorId, dayOfWeek, startTime, endTime, notes);

        // Notify doctor
        var centerName = jdbc.queryForList("SELECT COALESCE(p.organization_name, u.full_name) AS name FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=?::uuid", centerId);
        String cName = centerName.isEmpty() ? "المركز" : (String) centerName.get(0).get("name");

        jdbc.update("""
            INSERT INTO notifications (id, user_id, type, title, message, link)
            VALUES (?::uuid, ?::uuid, 'schedule_added', 'تم إضافة موعد عمل', ?, '/affiliations')
            """, UUID.randomUUID().toString(), doctorId,
            "أضاف " + cName + " موعد عمل جديد لك في جدولك");

        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    /** Delete a schedule slot — center only. */
    @DeleteMapping("/api/affiliations/schedule/{slotId}")
    public ResponseEntity<Void> deleteSchedule(
        @PathVariable String slotId,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        jdbc.update("DELETE FROM doctor_schedules WHERE id=?::uuid AND center_id=?::uuid", slotId, user.getId().toString());
        return ResponseEntity.ok().build();
    }

    /** Get schedule for a specific affiliation (public). */
    @GetMapping("/api/affiliations/{invitationId}/schedule")
    public ResponseEntity<List<Map<String, Object>>> getSchedule(@PathVariable String invitationId) {
        var rows = jdbc.queryForList("""
            SELECT ds.id::text, ds.day_of_week, ds.start_time::text, ds.end_time::text, ds.notes
            FROM doctor_schedules ds
            WHERE ds.center_id = (SELECT center_id FROM doctor_invitations WHERE id=?::uuid)
              AND ds.doctor_id = (SELECT doctor_id FROM doctor_invitations WHERE id=?::uuid)
            ORDER BY ds.day_of_week, ds.start_time
            """, invitationId, invitationId);
        return ResponseEntity.ok(rows);
    }

    // ─── Smart Suggestions ────────────────────────────────────────────────────

    @GetMapping("/api/suggestions")
    public ResponseEntity<List<Map<String, Object>>> getSuggestions(
        @RequestParam(required = false) String specialty,
        @AuthenticationPrincipal User user
    ) {
        String sql = """
            SELECT u.id::text, u.email, u.full_name, u.role::text,
                   p.organization_name, p.specialty, p.city, p.address,
                   p.avatar_url, p.availability_status, p.services, p.rating,
                   CASE p.availability_status
                     WHEN 'available' THEN 1
                     WHEN 'limited'   THEN 2
                     WHEN 'busy'      THEN 3
                     ELSE 4
                   END AS availability_rank
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE u.is_active = true
              AND u.role = 'MEDICAL_CENTER'
              AND p.availability_status NOT IN ('unavailable','closed','full_capacity','maintenance','offline')
            """;
        List<Object> params = new java.util.ArrayList<>();
        if (specialty != null && !specialty.isBlank()) {
            sql += " AND (? = ANY(p.services) OR LOWER(p.specialty) LIKE LOWER(?))";
            params.add(specialty);
            params.add("%" + specialty + "%");
        }
        sql += " ORDER BY availability_rank ASC, p.rating DESC NULLS LAST LIMIT 10";
        return ResponseEntity.ok(jdbc.queryForList(sql, params.toArray()));
    }

    // ─── Equipment ────────────────────────────────────────────────────────────

    @GetMapping("/api/equipment")
    public ResponseEntity<List<Map<String, Object>>> getEquipment(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList(
            "SELECT id::text, name, status, notes, created_at::text FROM equipment WHERE owner_id = ?::uuid ORDER BY name",
            user.getId().toString());
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/equipment")
    public ResponseEntity<Map<String, Object>> addEquipment(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO equipment (id, owner_id, name, status, notes)
            VALUES (?::uuid, ?::uuid, ?, ?, ?)
            """,
            id, user.getId().toString(),
            body.get("name"), body.getOrDefault("status", "available"), body.get("notes"));
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @PatchMapping("/api/equipment/{id}")
    public ResponseEntity<Void> updateEquipment(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        if (body.containsKey("status"))
            jdbc.update("UPDATE equipment SET status = ?, updated_at = NOW() WHERE id = ?::uuid AND owner_id = ?::uuid",
                body.get("status"), id, user.getId().toString());
        if (body.containsKey("notes"))
            jdbc.update("UPDATE equipment SET notes = ?, updated_at = NOW() WHERE id = ?::uuid AND owner_id = ?::uuid",
                body.get("notes"), id, user.getId().toString());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/equipment/{id}")
    public ResponseEntity<Void> deleteEquipment(@PathVariable String id, @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        jdbc.update("DELETE FROM equipment WHERE id = ?::uuid AND owner_id = ?::uuid", id, user.getId().toString());
        return ResponseEntity.ok().build();
    }

    // ─── Favorites ────────────────────────────────────────────────────────────

    @GetMapping("/api/favorites")
    public ResponseEntity<List<Map<String, Object>>> getFavorites(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList("""
            SELECT u.id::text, u.full_name, u.email, u.role::text,
                   p.organization_name, p.specialty, p.city, p.avatar_url,
                   p.availability_status, f.created_at::text AS favorited_at
            FROM favorites f
            JOIN users u ON u.id = f.target_id
            LEFT JOIN profiles p ON p.id = u.id
            WHERE f.user_id = ?::uuid
            ORDER BY f.created_at DESC
            """, user.getId().toString());
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/favorites/{targetId}")
    public ResponseEntity<Void> addFavorite(@PathVariable String targetId, @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        try {
            jdbc.update("INSERT INTO favorites (id, user_id, target_id) VALUES (?::uuid, ?::uuid, ?::uuid)",
                UUID.randomUUID().toString(), user.getId().toString(), targetId);
        } catch (Exception ignored) {} // already favorited
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/favorites/{targetId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable String targetId, @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        jdbc.update("DELETE FROM favorites WHERE user_id = ?::uuid AND target_id = ?::uuid",
            user.getId().toString(), targetId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/favorites/{targetId}/check")
    public ResponseEntity<Map<String, Object>> checkFavorite(@PathVariable String targetId, @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM favorites WHERE user_id = ?::uuid AND target_id = ?::uuid",
            Integer.class, user.getId().toString(), targetId);
        return ResponseEntity.ok(Map.of("favorited", count != null && count > 0));
    }

    // ─── Specialist Replacement ───────────────────────────────────────────────

    @GetMapping("/api/suggestions/replacement")
    public ResponseEntity<List<Map<String, Object>>> getReplacements(
        @RequestParam String excludeId,
        @RequestParam(required = false) String specialty
    ) {
        String sql = """
            SELECT u.id::text, u.full_name, u.email, p.specialty, p.city,
                   p.avatar_url, p.availability_status, p.bio, p.years_exp
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE u.is_active = true
              AND u.role = 'MEDICAL_CENTER'
              AND u.id != ?::uuid
              AND p.availability_status IN ('available','limited')
            """;
        List<Object> params = new java.util.ArrayList<>();
        params.add(excludeId);
        if (specialty != null && !specialty.isBlank()) {
            sql += " AND (LOWER(p.specialty) LIKE LOWER(?) OR ? = ANY(p.services))";
            params.add("%" + specialty + "%");
            params.add(specialty);
        }
        sql += " ORDER BY CASE p.availability_status WHEN 'available' THEN 1 ELSE 2 END, p.rating DESC NULLS LAST LIMIT 5";
        return ResponseEntity.ok(jdbc.queryForList(sql, params.toArray()));
    }

    private Map<String, Object> nestReferralProfiles(Map<String, Object> row) {
        Map<String, Object> result = new HashMap<>(row);
        Object doctorName = result.remove("doctor_full_name");
        Object doctorEmail = result.remove("doctor_email");
        Object doctorPhone = result.remove("doctor_phone");
        if (doctorName != null || doctorEmail != null) {
            result.put("doctor", Map.of(
                "full_name", doctorName != null ? doctorName : "",
                "email", doctorEmail != null ? doctorEmail : "",
                "phone", doctorPhone != null ? doctorPhone : ""
            ));
        } else {
            result.put("doctor", null);
        }
        Object centerOrgName = result.remove("center_organization_name");
        Object centerAddress = result.remove("center_address");
        if (centerOrgName != null) {
            result.put("center", Map.of(
                "organization_name", centerOrgName,
                "address", centerAddress != null ? centerAddress : ""
            ));
        } else {
            result.put("center", null);
        }
        return result;
    }
}
