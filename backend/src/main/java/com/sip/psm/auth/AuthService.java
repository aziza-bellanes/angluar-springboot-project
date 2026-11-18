package com.sip.psm.auth;

import com.sip.psm.auth.AuthDtos.AuthResponse;
import com.sip.psm.auth.AuthDtos.LoginRequest;
import com.sip.psm.auth.AuthDtos.RegisterRequest;
import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.security.JwtService;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.RoleRepository;
import com.sip.psm.user.User;
import com.sip.psm.user.UserDtos.UserResponse;
import com.sip.psm.user.UserRepository;
import java.util.Locale;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final ApplicationEventPublisher events;

    public AuthService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
                       JwtService jwt, ApplicationEventPublisher events) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.events = events;
    }

    /** Public registration creates a collector (BIDDER) account and notifies the administrator. */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleException("email_taken", "An account already exists for this email");
        }
        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhone(blankToNull(request.phone()));
        user.setRoles(Set.of(roles.lockBySystemKey(RoleName.BIDDER).orElseThrow()));
        users.save(user);
        events.publishEvent(new UserRegisteredEvent(user.getId(),
                user.getFirstName() + " " + user.getLastName(), user.getEmail()));
        return respond(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmailIgnoreCase(normalize(request.email()))
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPassword()))
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!user.isEnabled()) {
            throw new DisabledException("Account disabled");
        }
        return respond(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        return users.findByEmailIgnoreCase(email).map(UserResponse::from)
                .orElseThrow(() -> new BadCredentialsException("Unknown account"));
    }

    private AuthResponse respond(User user) {
        JwtService.IssuedToken token = jwt.issue(user.getEmail());
        return new AuthResponse(token.value(), token.expiresAt(), UserResponse.from(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
