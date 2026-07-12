package com.medilink.domain.referral;

import com.medilink.domain.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/referrals")
@RequiredArgsConstructor
@Tag(name = "Referrals", description = "Referral management endpoints")
@SecurityRequirement(name = "bearerAuth")
public class ReferralController {

    private final ReferralService referralService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
        summary = "Create a referral",
        description = "Creates a new referral in DRAFT status. Set `send: true` to immediately transition to SENT."
    )
    public ResponseEntity<ReferralResponse> create(
        @Valid @RequestBody CreateReferralRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        ReferralResponse response = referralService.create(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get referral by ID")
    public ResponseEntity<ReferralResponse> getById(
        @PathVariable UUID id,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(referralService.getById(id, currentUser));
    }

    @PostMapping("/{id}/redirect")
    @Operation(
        summary = "Redirect a referral",
        description = "Marks this referral as REDIRECTED and creates a new SENT referral to a different provider."
    )
    public ResponseEntity<java.util.Map<String, UUID>> redirect(
        @PathVariable UUID id,
        @jakarta.validation.Valid @RequestBody RedirectReferralRequest request
    ) {
        UUID newReferralId = referralService.redirectReferral(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(java.util.Map.of("newReferralId", newReferralId));
    }
}
