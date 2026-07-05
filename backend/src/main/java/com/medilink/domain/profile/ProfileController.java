package com.medilink.domain.profile;

import com.medilink.domain.user.User;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
@Tag(name = "Profiles")
@SecurityRequirement(name = "bearerAuth")
public class ProfileController {

    private final JdbcTemplate jdbc;

    private static final String PROFILE_SELECT = """
        SELECT p.id::text, p.full_name, p.email, p.phone, p.specialty,
               p.license_number, p.date_of_birth::text AS date_of_birth,
               p.organization_name, p.provider_type, p.address, p.avatar_url,
               p.availability_status,
               p.created_at::text, p.updated_at::text
        FROM profiles p
        """;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        var rows = jdbc.queryForList(PROFILE_SELECT + " WHERE p.id = ?::uuid", user.getId().toString());
        if (rows.isEmpty()) {
            // Auto-create missing profile
            jdbc.update("""
                INSERT INTO profiles (id, full_name, email)
                VALUES (?::uuid, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, user.getId().toString(), user.getFullName(), user.getEmail());
            rows = jdbc.queryForList(PROFILE_SELECT + " WHERE p.id = ?::uuid", user.getId().toString());
        }
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> byId(@PathVariable String id) {
        var rows = jdbc.queryForList(PROFILE_SELECT + " WHERE p.id = ?::uuid", id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        String uid = user.getId().toString();
        if (body.containsKey("full_name")) {
            jdbc.update("UPDATE profiles SET full_name = ?, updated_at = NOW() WHERE id = ?::uuid", body.get("full_name"), uid);
            jdbc.update("UPDATE users SET full_name = ?, updated_at = NOW() WHERE id = ?::uuid", body.get("full_name"), uid);
        }
        if (body.containsKey("phone"))             jdbc.update("UPDATE profiles SET phone = ?, updated_at = NOW() WHERE id = ?::uuid", body.get("phone"), uid);
        if (body.containsKey("address"))           jdbc.update("UPDATE profiles SET address = ?, updated_at = NOW() WHERE id = ?::uuid", body.get("address"), uid);
        if (body.containsKey("specialty"))         jdbc.update("UPDATE profiles SET specialty = ?, updated_at = NOW() WHERE id = ?::uuid", body.get("specialty"), uid);
        if (body.containsKey("organization_name")) jdbc.update("UPDATE profiles SET organization_name = ?, updated_at = NOW() WHERE id = ?::uuid", body.get("organization_name"), uid);
        var rows = jdbc.queryForList(PROFILE_SELECT + " WHERE p.id = ?::uuid", uid);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @GetMapping("/batch")
    public ResponseEntity<List<Map<String, Object>>> batch(@RequestParam String ids) {
        String[] idArr = ids.split(",");
        if (idArr.length == 0) return ResponseEntity.ok(List.of());
        // Build placeholders
        String placeholders = String.join(",", Arrays.stream(idArr).map(i -> "?::uuid").toArray(String[]::new));
        String sql = PROFILE_SELECT + " WHERE p.id IN (" + placeholders + ")";
        var rows = jdbc.queryForList(sql, (Object[]) idArr);
        return ResponseEntity.ok(rows);
    }
}
