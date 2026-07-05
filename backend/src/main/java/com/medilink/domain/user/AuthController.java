package com.medilink.domain.user;

import com.medilink.config.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration and login")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JdbcTemplate jdbc;

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6) String password,
        @NotBlank String fullName,
        String role,
        String specialty,
        String organizationName,
        String providerType
    ) {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
    ) {}

    public record AuthResponse(
        String token,
        String userId,
        String email,
        String fullName,
        String appRole
    ) {}

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        UserRole userRole = req.role() != null
            ? UserRole.fromAppRole(req.role())
            : UserRole.PATIENT;

        User user = User.builder()
            .email(req.email())
            .passwordHash(passwordEncoder.encode(req.password()))
            .fullName(req.fullName())
            .role(userRole)
            .isActive(true)
            .build();

        userRepository.save(user);

        // Create profile row
        String orgName = req.organizationName();
        if (orgName == null && userRole == UserRole.MEDICAL_CENTER) orgName = req.fullName();
        jdbc.update(
            """
            INSERT INTO profiles (id, full_name, email, phone, specialty, organization_name, provider_type)
            VALUES (?::uuid, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING
            """,
            user.getId().toString(),
            req.fullName(),
            req.email(),
            null,
            req.specialty(),
            orgName,
            req.providerType()
        );

        String token = jwtService.generateToken(user);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new AuthResponse(token, user.getId().toString(), user.getEmail(), user.getFullName(), userRole.toAppRole()));
    }

    @PostMapping("/login")
    @Operation(summary = "Login and receive JWT token")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );
        User user = userRepository.findByEmail(req.email()).orElseThrow();
        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(
            new AuthResponse(token, user.getId().toString(), user.getEmail(), user.getFullName(), user.getRole().toAppRole())
        );
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user info")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(
            new AuthResponse(null, currentUser.getId().toString(), currentUser.getEmail(), currentUser.getFullName(), currentUser.getRole().toAppRole())
        );
    }

    public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 6) String newPassword
    ) {}

    @PostMapping("/change-password")
    @Operation(summary = "Change current user password")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<Void> changePassword(
        @Valid @RequestBody ChangePasswordRequest req,
        @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!passwordEncoder.matches(req.currentPassword(), currentUser.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String newHash = passwordEncoder.encode(req.newPassword());
        jdbc.update("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?::uuid",
            newHash, currentUser.getId().toString());
        return ResponseEntity.ok().build();
    }
}
