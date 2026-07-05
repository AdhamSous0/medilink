package com.medilink.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "medilink.jwt")
public record JwtProperties(String secret, long expirationMs) {}
