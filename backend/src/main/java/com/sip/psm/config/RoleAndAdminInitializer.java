package com.sip.psm.config;

import com.sip.psm.user.Role;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.RoleRepository;
import com.sip.psm.user.User;
import com.sip.psm.user.UserRepository;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Ensures every role exists and creates the first administrator from environment variables. */
@Component
@Order(1)
public class RoleAndAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RoleAndAdminInitializer.class);
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final RoleRepository roles;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AtelierProperties.Bootstrap bootstrap;

    public RoleAndAdminInitializer(RoleRepository roles, UserRepository users, PasswordEncoder passwordEncoder,
                                   AtelierProperties properties) {
        this.roles = roles;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.bootstrap = properties.bootstrap();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Arrays.stream(RoleName.values())
                .filter(name -> roles.findByLibelle(name).isEmpty())
                .forEach(name -> roles.save(new Role(name)));

        String email = bootstrap.adminEmail();
        if (email == null || email.isBlank() || users.existsByEmailIgnoreCase(email)) {
            return;
        }
        String password = bootstrap.adminPassword();
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must contain at least "
                    + MIN_PASSWORD_LENGTH + " characters");
        }
        User admin = new User();
        admin.setFirstName("Atelier");
        admin.setLastName("Admin");
        admin.setEmail(email.trim().toLowerCase(Locale.ROOT));
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRoles(Set.of(roles.require(RoleName.ADMIN)));
        users.save(admin);
        log.info("Bootstrap administrator {} created", admin.getEmail());
    }
}
