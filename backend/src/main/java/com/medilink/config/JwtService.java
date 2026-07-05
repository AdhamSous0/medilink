package com.medilink.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(JwtProperties.class)
@Slf4j
public class JwtService {

    private static final String INSECURE_DEFAULT =
        "change-me-in-production-must-be-at-least-256-bits-long-secret-key";

    private final JwtProperties props;

    @PostConstruct
    public void validateSecret() {
        String secret = props.secret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                "JWT secret is too short — minimum 32 characters required. Set JWT_SECRET env var.");
        }
        if (INSECURE_DEFAULT.equals(secret)) {
            log.warn("⚠️  Using the default JWT secret. Set JWT_SECRET environment variable before going to production!");
        }
    }

    public String generateToken(UserDetails user) {
        return generateToken(Map.of(), user);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails user) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .claims(extraClaims)
            .subject(user.getUsername())
            .issuedAt(new Date(now))
            .expiration(new Date(now + props.expirationMs()))
            .signWith(signingKey())
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails user) {
        String username = extractUsername(token);
        return username.equals(user.getUsername()) && !isExpired(token);
    }

    private boolean isExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
    }
}
