package com.medilink.domain.practitioner;

import com.medilink.domain.medicalcenter.MedicalCenter;
import com.medilink.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "affiliations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"practitioner_user_id", "medical_center_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Affiliation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practitioner_user_id", nullable = false)
    private User practitionerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_center_id", nullable = false)
    private MedicalCenter medicalCenter;

    @Column(nullable = false)
    @Builder.Default
    private String status = "active";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() { createdAt = Instant.now(); }

    public boolean isActive() { return "active".equals(status); }
}
