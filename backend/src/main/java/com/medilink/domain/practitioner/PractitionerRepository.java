package com.medilink.domain.practitioner;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PractitionerRepository extends JpaRepository<Practitioner, UUID> {

    @Query("SELECT p FROM Practitioner p WHERE p.user.id = :userId")
    Optional<Practitioner> findByUserId(UUID userId);

    @Query("SELECT p FROM Practitioner p JOIN FETCH p.user WHERE p.id = :id")
    Optional<Practitioner> findByIdWithUser(UUID id);
}
