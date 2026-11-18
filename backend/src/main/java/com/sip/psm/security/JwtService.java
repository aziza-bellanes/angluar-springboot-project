package com.sip.psm.security;

import com.sip.psm.config.AtelierProperties;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Issues and verifies the stateless HMAC-signed access tokens. */
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final AtelierProperties.Jwt settings;
    private final Clock clock;

    public JwtService(AtelierProperties properties, Clock clock) {
        this.settings = properties.jwt();
        this.clock = clock;
        String secret = settings.secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must contain at least " + MIN_SECRET_BYTES + " bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public IssuedToken issue(String email) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(settings.expiration());
        String token = Jwts.builder()
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    /** Returns the email contained in a valid token, or empty when the token is invalid or expired. */
    public Optional<String> verify(String token) {
        try {
            return Optional.ofNullable(Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
