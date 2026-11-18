package com.sip.psm.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Strongly typed application settings bound from the {@code atelier.*} namespace.
 */
@Validated
@ConfigurationProperties(prefix = "atelier")
public record AtelierProperties(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Cors cors,
        @Valid @NotNull Mail mail,
        @Valid @NotNull Bootstrap bootstrap,
        @Valid @NotNull Auction auction,
        boolean demoData) {

    public record Jwt(String secret, @NotNull Duration expiration) {
    }

    public record Cors(@NotNull List<String> allowedOrigins) {
    }

    public record Mail(@NotBlank String adminAddress, @NotBlank String fromAddress,
                       @NotBlank String publicUrl) {
        public Mail {
            if (publicUrl != null) {
                var uri = java.net.URI.create(publicUrl);
                if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                        || uri.getHost() == null || uri.getUserInfo() != null
                        || uri.getQuery() != null || uri.getFragment() != null) {
                    throw new IllegalArgumentException("PUBLIC_URL must be an absolute HTTP(S) site URL");
                }
                publicUrl = publicUrl.replaceAll("/+$", "");
            }
        }
    }

    public record Bootstrap(String adminEmail, String adminPassword) {
    }

    public record Auction(@NotNull Duration softClose, @NotNull Duration lifecycleInterval) {
    }
}
