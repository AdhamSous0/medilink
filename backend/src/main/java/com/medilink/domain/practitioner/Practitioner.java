package com.medilink.domain.practitioner;

import com.medilink.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "practitioners")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Practitioner {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "practitioner_specialty", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    private PractitionerSpecialty specialty;

    @Column(name = "license_number", nullable = false, unique = true)
    private String licenseNumber;

    private String bio;

    @Column(name = "accepts_referrals", nullable = false)
    private boolean acceptsReferrals = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }
}
