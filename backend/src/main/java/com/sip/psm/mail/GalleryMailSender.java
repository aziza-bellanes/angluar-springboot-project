package com.sip.psm.mail;

import com.sip.psm.config.AtelierProperties;
import jakarta.mail.MessagingException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/** Failure is isolated per recipient; a failed customer email never prevents the admin attempt. */
@Service
public class GalleryMailSender {
    private static final Logger log = LoggerFactory.getLogger(GalleryMailSender.class);
    private final JavaMailSender sender;
    private final GalleryMailTemplate template;
    private final String from;

    public GalleryMailSender(JavaMailSender sender, GalleryMailTemplate template, AtelierProperties properties) {
        this.sender = sender;
        this.template = template;
        this.from = properties.mail().fromAddress();
    }

    public void send(String recipient, GalleryMailTemplate.Content content) {
        try {
            var rendered = template.render(content);
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from, "ATELIER Gallery");
            helper.setReplyTo(from);
            helper.setTo(recipient);
            helper.setSubject("[ATELIER] " + content.subject().replaceAll("[\\r\\n]+", " "));
            helper.setText(rendered.plain(), rendered.html());
            helper.addInline("atelier-gallery-art", new ClassPathResource("mail/oleanders.jpg"), "image/jpeg");
            message.saveChanges();
            sender.send(message);
            log.info("Gallery notification handed to SMTP: {}", content.actionPath());
        } catch (MailException | MessagingException | UnsupportedEncodingException ex) {
            // Credentials, full SMTP errors and customer addresses do not belong in application logs.
            log.warn("Gallery notification failed ({}) for action {}; business transaction is committed",
                    ex.getClass().getSimpleName(), content.actionPath());
        }
    }
}
