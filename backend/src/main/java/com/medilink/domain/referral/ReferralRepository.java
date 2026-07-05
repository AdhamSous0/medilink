package com.medilink.domain.referral;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ReferralRepository extends JpaRepository<Referral, UUID> {

    @Query("""
        SELECT r FROM Referral r
        JOIN FETCH r.patient
        JOIN FETCH r.referringPractitioner rp
        JOIN FETCH rp.user
        WHERE r.id = :id
        """)
    Optional<Referral> findByIdWithDetails(UUID id);

    Page<Referral> findByReferringPractitionerId(UUID practitionerId, Pageable pageable);

    Page<Referral> findByReceivingPractitionerId(UUID practitionerId, Pageable pageable);

    Page<Referral> findByPatientId(UUID patientId, Pageable pageable);
}
