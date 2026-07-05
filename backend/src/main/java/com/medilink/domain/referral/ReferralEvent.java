package com.medilink.domain.referral;

import com.medilink.domain.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "referral_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referral_id", nullable = false)
    private Referral referral;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", columnDefinition = "referral_event_type", nullable = false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private ReferralEventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    void prePersist() { occurredAt = Instant.now(); }

    public static ReferralEvent of(ReferralEventType type, User actor) {
        return ReferralEvent.builder()
            .eventType(type)
            .actor(actor)
            .build();
    }

    public static ReferralEvent of(ReferralEventType type, User actor, Map<String, Object> payload) {
        return ReferralEvent.builder()
            .eventType(type)
            .actor(actor)
            .payload(payload)
            .build();
    }
}
