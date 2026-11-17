package com.sip.psm.config;

import com.sip.psm.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Stateless JWT security. Authorization matrix (specification + ATELIER extensions):
 * <ul>
 *   <li>Public: gallery reads, auction reads, login, registration, WebSocket handshake.</li>
 *   <li>Studio catalogue (artists, exhibitions, artworks): read + create for ADMIN and COLLABORATEUR,
 *       update + delete for ADMIN only.</li>
 *   <li>Studio auctions and user administration: ADMIN only.</li>
 *   <li>Placing bids: BIDDER only.</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String ADMIN = "ADMIN";
    private static final String COLLABORATEUR = "COLLABORATEUR";
    private static final String BIDDER = "BIDDER";

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/artworks/**", "/api/artists/**",
                                "/api/exhibitions/**", "/api/auctions/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auctions/*/bids").hasRole(BIDDER)
                        .requestMatchers("/api/admin/**", "/api/studio/auctions/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/studio/**").hasAnyRole(ADMIN, COLLABORATEUR)
                        .requestMatchers(HttpMethod.POST, "/api/studio/**").hasAnyRole(ADMIN, COLLABORATEUR)
                        .requestMatchers(HttpMethod.PUT, "/api/studio/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/studio/**").hasRole(ADMIN)
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                writeProblem(res, HttpServletResponse.SC_UNAUTHORIZED, "authentication_required",
                                        "Authentication is required"))
                        .accessDeniedHandler((req, res, ex) ->
                                writeProblem(res, HttpServletResponse.SC_FORBIDDEN, "forbidden",
                                        "You are not allowed to perform this action")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AtelierProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private static void writeProblem(HttpServletResponse response, int status, String code, String detail)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("{\"status\":%d,\"code\":\"%s\",\"detail\":\"%s\"}".formatted(status, code, detail));
    }
}
