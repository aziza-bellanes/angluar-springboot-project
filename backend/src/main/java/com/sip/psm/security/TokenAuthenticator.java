package com.sip.psm.security;

import com.sip.psm.user.User;
import com.sip.psm.user.UserRepository;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns a raw bearer token into a Spring Security authentication. Shared by the HTTP filter
 * and the STOMP channel interceptor so both entry points apply identical rules.
 */
@Component
public class TokenAuthenticator {

    private static final String BEARER = "Bearer ";

    private final JwtService jwt;
    private final UserRepository users;

    public TokenAuthenticator(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Optional<UsernamePasswordAuthenticationToken> authenticate(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER)) {
            return Optional.empty();
        }
        return jwt.verify(authorizationHeader.substring(BEARER.length()))
                .flatMap(users::findByEmailIgnoreCase)
                .filter(User::isEnabled)
                .map(TokenAuthenticator::toAuthentication);
    }

    private static UsernamePasswordAuthenticationToken toAuthentication(User user) {
        var authorities = user.roleNames().stream()
                .map(role -> new SimpleGrantedAuthority(role.authority()))
                .toList();
        return UsernamePasswordAuthenticationToken.authenticated(user.getEmail(), null, authorities);
    }
}
