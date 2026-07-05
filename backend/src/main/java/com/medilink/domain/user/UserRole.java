package com.medilink.domain.user;

public enum UserRole {
    ADMIN, PRACTITIONER, LAB_STAFF, PATIENT,
    DOCTOR, MEDICAL_CENTER;

    public static UserRole fromAppRole(String appRole) {
        return switch (appRole.toLowerCase()) {
            case "doctor"                  -> DOCTOR;
            case "medical_center"          -> MEDICAL_CENTER;
            case "patient"                 -> PATIENT;
            case "laboratory", "lab_staff" -> LAB_STAFF;
            case "admin"                   -> ADMIN;
            default                        -> PATIENT;
        };
    }

    public String toAppRole() {
        return switch (this) {
            case DOCTOR         -> "doctor";
            case MEDICAL_CENTER -> "medical_center";
            case PATIENT        -> "patient";
            case LAB_STAFF      -> "laboratory";
            case ADMIN          -> "admin";
            default             -> "doctor";
        };
    }
}
