package com.medilink.domain.medicalcenter;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MedicalCenterRepository extends JpaRepository<MedicalCenter, UUID> {}
