package com.sip.psm.auth;

import com.sip.psm.config.AtelierProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Specification requirement: "after a registration, an email must be sent to the admin".
 * Runs asynchronously after commit, so an SMTP outage never blocks or rolls back a registration.
 */
@Component
public class RegistrationMailListener {

    private static final Logger log = LoggerFactory.getLogger(RegistrationMailListener.class);

    private final JavaMailSender mailSender;
    private final AtelierProperties.Mail settings;

    public RegistrationMailListener(JavaMailSender mailSender, AtelierProperties properties) {
        this.mailSender = mailSender;
        this.settings = properties.mail();
    }

    @Async
    @TransactionalEventListener
    public void onUserRegistered(UserRegisteredEvent event) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(settings.fromAddress());
        message.setTo(settings.adminAddress());
        message.setSubject("ATELIER — new registration: " + event.fullName());
        message.setText("""
                A new collector account has been created on ATELIER.

                Name:  %s
                Email: %s
                ID:    %d

                You can review roles from the Studio > Users page.
                """.formatted(event.fullName(), event.email(), event.userId()));
        try {
            mailSender.send(message);
            log.info("Registration notification sent for user {}", event.userId());
        } catch (MailException ex) {
            log.warn("Registration of user {} saved, but the admin notification failed: {}",
                    event.userId(), ex.getMessage());
        }
    }
}
