package com.medilink.domain.referral;

import com.medilink.domain.medicalcenter.MedicalCenter;
import com.medilink.domain.patient.Patient;
import com.medilink.domain.practitioner.Practitioner;
import com.medilink.domain.practitioner.PractitionerSpecialty;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "referrals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Referral {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referring_practitioner_id", nullable = false)
    private Practitioner referringPractitioner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiving_practitioner_id")
    private Practitioner receivingPractitioner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referring_center_id")
    private MedicalCenter referringCenter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiving_center_id")
    private MedicalCenter receivingCenter;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "referral_status", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    @Builder.Default
    private ReferralStatus status = ReferralStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "urgency_level", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    @Builder.Default
    private UrgencyLevel urgency = UrgencyLevel.ROUTINE;

    @Column(nullable = false)
    private String reason;

    @Column(name = "clinical_notes")
    private String clinicalNotes;

    @Column(name = "diagnosis_code")
    private String diagnosisCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_specialty", columnDefinition = "practitioner_specialty")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    private PractitionerSpecialty requestedSpecialty;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "viewed_at")
    private Instant viewedAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "redirected_to_referral_id")
    private Referral redirectedTo;

    @OneToMany(mappedBy = "referral", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ReferralEvent> events = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public void addEvent(ReferralEvent event) {
        event.setReferral(this);
        events.add(event);
    }
}
