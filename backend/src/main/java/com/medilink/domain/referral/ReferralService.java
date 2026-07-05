package com.medilink.domain.referral;

import com.medilink.domain.medicalcenter.MedicalCenter;
import com.medilink.domain.medicalcenter.MedicalCenterRepository;
import com.medilink.domain.patient.Patient;
import com.medilink.domain.patient.PatientRepository;
import com.medilink.domain.practitioner.Practitioner;
import com.medilink.domain.practitioner.PractitionerRepository;
import com.medilink.domain.user.User;
import com.medilink.shared.exception.BusinessRuleException;
import com.medilink.shared.exception.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final PatientRepository patientRepository;
    private final PractitionerRepository practitionerRepository;
    private final MedicalCenterRepository medicalCenterRepository;

    @PersistenceContext
    private EntityManager em;

    public ReferralResponse create(CreateReferralRequest req, User currentUser) {
        Practitioner referring = practitionerRepository.findByUserId(currentUser.getId())
            .orElseThrow(() -> new BusinessRuleException("Current user is not a registered practitioner"));

        Patient patient = patientRepository.findById(req.patientId())
            .orElseThrow(() -> new ResourceNotFoundException("Patient", req.patientId()));

        Practitioner receiving = null;
        if (req.receivingPractitionerId() != null) {
            receiving = practitionerRepository.findByIdWithUser(req.receivingPractitionerId())
                .orElseThrow(() -> new ResourceNotFoundException("Practitioner", req.receivingPractitionerId()));
            if (!receiving.isAcceptsReferrals()) {
                throw new BusinessRuleException("Practitioner %s is not accepting referrals".formatted(receiving.getId()));
            }
        } else if (req.requestedSpecialty() == null) {
            throw new BusinessRuleException("Either receivingPractitionerId or requestedSpecialty must be provided");
        }

        MedicalCenter receivingCenter = null;
        if (req.receivingCenterId() != null) {
            receivingCenter = medicalCenterRepository.findById(req.receivingCenterId())
                .orElseThrow(() -> new ResourceNotFoundException("MedicalCenter", req.receivingCenterId()));
        }

        Instant expiresAt = req.expiresAt() != null
            ? req.expiresAt()
            : Instant.now().plus(30, ChronoUnit.DAYS);

        Referral referral = Referral.builder()
            .patient(patient)
            .referringPractitioner(referring)
            .receivingPractitioner(receiving)
            .receivingCenter(receivingCenter)
            .urgency(req.urgency())
            .reason(req.reason())
            .clinicalNotes(req.clinicalNotes())
            .diagnosisCode(req.diagnosisCode())
            .requestedSpecialty(req.requestedSpecialty())
            .expiresAt(expiresAt)
            .status(ReferralStatus.DRAFT)
            .build();

        referral.addEvent(ReferralEvent.of(ReferralEventType.CREATED, currentUser));

        if (req.send()) {
            ReferralStateMachine.assertTransition(ReferralStatus.DRAFT, ReferralStatus.SENT);
            referral.setStatus(ReferralStatus.SENT);
            referral.setSentAt(Instant.now());
            referral.addEvent(ReferralEvent.of(ReferralEventType.SENT, currentUser));
        }

        Referral saved = referralRepository.save(referral);
        return ReferralResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ReferralResponse getById(UUID id) {
        Referral referral = referralRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new ResourceNotFoundException("Referral", id));
        return ReferralResponse.from(referral);
    }

    /**
     * Delegates to the redirect_referral PostgreSQL function which atomically:
     * 1. Marks the old referral as REDIRECTED
     * 2. Creates a new referral (SENT) with the new provider
     * 3. Links them via redirected_to_referral_id
     */
    @Transactional
    public UUID redirectReferral(UUID referralId, RedirectReferralRequest req) {
        Object result = em.createNativeQuery(
            "SELECT redirect_referral(:referralId, :centerId, :doctorUserId)"
        )
        .setParameter("referralId",   referralId)
        .setParameter("centerId",     req.newCenterId())
        .setParameter("doctorUserId", req.newDoctorUserId())
        .getSingleResult();

        return UUID.fromString(result.toString());
    }
}
