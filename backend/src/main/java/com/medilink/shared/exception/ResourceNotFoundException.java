package com.medilink.shared.exception;

import java.util.UUID;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, UUID id) {
        super("%s not found with id: %s".formatted(resource, id));
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
