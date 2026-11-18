package com.sip.psm.auth;

import com.sip.psm.config.AtelierProperties;
import com.sip.psm.mail.GalleryMailSender;
import com.sip.psm.mail.GalleryMailTemplate.Content;
import com.sip.psm.mail.GalleryMailTemplate.Detail;
import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Customer and administrator receive individual branded messages after account creation commits. */
@Component
public class RegistrationMailListener {
    private final GalleryMailSender sender;
    private final String admin;

    public RegistrationMailListener(GalleryMailSender sender, AtelierProperties properties) {
        this.sender = sender;
        this.admin = properties.mail().adminAddress();
    }

    @Async("galleryMailExecutor")
    @TransactionalEventListener
    public void onUserRegistered(UserRegisteredEvent event) {
        sender.send(event.email(), new Content("Welcome to the gallery", "Your place in the gallery.",
                "Welcome to ATELIER. Your account is ready.", "Hello, " + event.fullName() + ".",
                List.of("Welcome to ATELIER, a space where artists, collectors and new perspectives meet.",
                        "Your account is ready. Sign in with the password chosen when the account was created. If a gallery administrator created your account, contact them for your access details."),
                List.of(new Detail("Your account", event.email())), "Explore the gallery", "/login"));
        sender.send(admin, new Content("New account · " + event.fullName(), "A new gallery member.",
                "An account has been created on ATELIER.", "Hello, gallery team.",
                List.of("A new account is ready. You can review its details and permissions in Studio."),
                List.of(new Detail("Name", event.fullName()), new Detail("Email", event.email()),
                        new Detail("Account reference", String.valueOf(event.userId()))),
                "Review gallery members", "/studio/users"));
    }
}
