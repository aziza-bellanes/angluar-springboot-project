package com.sip.psm.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.sip.psm.auth.RegistrationMailListener;
import com.sip.psm.auth.UserRegisteredEvent;
import com.sip.psm.auction.AuctionResultEvent;
import com.sip.psm.auction.AuctionStatus;
import com.sip.psm.auction.BidAcceptedEvent;
import com.sip.psm.artist.ArtistContactCreatedEvent;
import com.sip.psm.config.AtelierProperties;
import com.sip.psm.mail.GalleryMailTemplate.Content;
import com.sip.psm.mail.GalleryMailTemplate.Detail;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class GalleryMailTemplateTest {
    private static final String ADMIN = "admin@example.test";
    private final JavaMailSender transport = mock(JavaMailSender.class);
    private final List<MimeMessage> messages = new ArrayList<>();
    private GalleryMailTemplate template;
    private GalleryMailSender sender;
    private AtelierProperties settings;

    @BeforeEach
    void setup() throws Exception {
        settings = new AtelierProperties(null, null,
                new AtelierProperties.Mail(ADMIN, "gallery@example.test", "https://gallery.example.test/"),
                null, null, false);
        template = new GalleryMailTemplate(settings);
        sender = new GalleryMailSender(transport, template, settings);
        when(transport.createMimeMessage()).thenAnswer(call -> {
            MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
            messages.add(message);
            return message;
        });
    }

    @Test
    void escapesUntrustedMarkupAndUsesConfiguredSiteWithoutReprocessingSlots() {
        var content = new Content("Welcome", "A <new> perspective", "Preview", "Hello, <script> & ${details}",
                List.of("Text <img src=x onerror=alert(1)>"), List.of(new Detail("Email", "a&b@example.test")),
                "View the gallery", "/login");
        var rendered = template.render(content);
        assertThat(rendered.html()).contains("&lt;script&gt; &amp; ${details}", "&lt;img src=x onerror=alert(1)&gt;",
                "https://gallery.example.test/login", "#101d35", "#315c91", "#e7b84b", "#f4edde")
                .doesNotContain("<script>", "<img src=x");
        assertThat(rendered.plain()).contains("Hello, <script> & ${details}", "a&b@example.test", "https://gallery.example.test/login");
    }

    @Test
    void rejectsUnsafeSiteAndExternalActions() {
        assertThatThrownBy(() -> new AtelierProperties.Mail(ADMIN, ADMIN, "javascript:alert(1)"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AtelierProperties.Mail(ADMIN, ADMIN, "https://user:pass@example.test"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Content("x", "x", "x", "x", List.of(), List.of(), "x", "//other.test"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void welcomeAndAdminMimeAreSeparateUnicodeMessagesWithoutPasswords() throws Exception {
        new RegistrationMailListener(sender, settings).onUserRegistered(new UserRegisteredEvent(42L, "Inès & <Marc>", "ines@example.test"));
        assertThat(messages).hasSize(2);
        assertThat(messages.get(0).getAllRecipients()[0].toString()).isEqualTo("ines@example.test");
        assertThat(messages.get(1).getAllRecipients()[0].toString()).isEqualTo(ADMIN);
        for (MimeMessage message : messages) {
            message.saveChanges();
            assertThat(message.isMimeType("multipart/*")).isTrue();
            assertThat(body(message, "text/plain")).contains("ATELIER", "Inès").doesNotContain("Admin123!", "Atelier2026!");
            assertThat(body(message, "text/html")).contains("&lt;Marc&gt;", "#e7b84b");
        }
        writePreview("welcome", messages.get(0));
        writePreview("admin-account", messages.get(1));
    }

    @Test
    void oneFailedRecipientDoesNotPreventAdminAttempt() {
        doThrow(new MailSendException("private SMTP failure")).when(transport).send(any(MimeMessage.class));
        new RegistrationMailListener(sender, settings).onUserRegistered(new UserRegisteredEvent(1L, "A Collector", "collector@example.test"));
        assertThat(messages).hasSize(2);
    }

    @Test
    void artworkWinnerAndCancellationMessagesKeepCustomerAndAdminDataSeparate() throws Exception {
        var listener = new GalleryActivityMailListener(sender, settings);
        var winner = new AuctionResultEvent.Recipient(8L, "Inès Collector", "ines@example.test");
        listener.onAuctionResult(new AuctionResultEvent(12L, "Composition in Blue", "Mira Laurent", AuctionStatus.CLOSED,
                new BigDecimal("1250.00"), winner, winner));
        assertThat(messages).hasSize(2);
        assertThat(messages.get(0).getSubject()).contains("You won");
        assertThat(body(messages.get(0), "text/plain")).contains("EUR 1250.00", "arranged separately")
                .doesNotContain("Winner email");
        assertThat(body(messages.get(1), "text/plain")).contains("ines@example.test", "Winning bid recorded");
        writePreview("winner", messages.get(0));
        writePreview("admin-result", messages.get(1));
        messages.clear();
        listener.onAuctionResult(new AuctionResultEvent(13L, "Quiet Garden", "Mira Laurent", AuctionStatus.CLOSED,
                new BigDecimal("100.00"), null, null));
        assertThat(messages).hasSize(1);
        assertThat(body(messages.get(0), "text/plain")).contains("Closed without bids").doesNotContain("Winning bid recorded");
        writePreview("admin-no-bids", messages.get(0));
        messages.clear();
        listener.onAuctionResult(new AuctionResultEvent(14L, "Quiet Garden", "Mira Laurent", AuctionStatus.CANCELLED,
                new BigDecimal("100.00"), null, winner));
        assertThat(messages).hasSize(2);
        assertThat(messages.get(0).getAllRecipients()[0].toString()).isEqualTo("ines@example.test");
        assertThat(body(messages.get(0), "text/plain")).contains("No winning bid");
        writePreview("cancelled", messages.get(0));
    }

    @Test
    void bidMessagesDoNotDiscloseOtherCollectorsEmailAndContactIsNotAnAccount() throws Exception {
        var listener = new GalleryActivityMailListener(sender, settings);
        listener.onBidAccepted(new BidAcceptedEvent(12L, "Composition in Blue", "Mira Laurent", new BigDecimal("1250.00"),
                Instant.parse("2026-12-01T18:30:00Z"),
                new BidAcceptedEvent.Recipient(8L, "Inès Collector", "ines@example.test"),
                new BidAcceptedEvent.Recipient(9L, "Another Collector", "other@example.test")));
        assertThat(messages).hasSize(2);
        assertThat(body(messages.get(0), "text/plain")).contains("highest bidder when it was accepted").doesNotContain("other@example.test");
        assertThat(body(messages.get(1), "text/plain")).contains("higher bid", "UTC").doesNotContain("ines@example.test");
        writePreview("bid-confirmation", messages.get(0));
        writePreview("outbid", messages.get(1));
        messages.clear();
        listener.onArtistContact(new ArtistContactCreatedEvent(22L, "Mira Laurent", "mira@example.test"));
        assertThat(messages).hasSize(2);
        assertThat(body(messages.get(0), "text/plain")).contains("does not create a sign-in account");
        writePreview("artist-contact", messages.get(0));
        writePreview("admin-contact", messages.get(1));
    }

    private static void writePreview(String name, MimeMessage message) throws Exception {
        Path directory = Path.of("target", "email-previews");
        Files.createDirectories(directory);
        Files.writeString(directory.resolve(name + ".html"), body(message, "text/html"));
    }

    public static String body(Part part, String mimeType) throws Exception {
        if (part instanceof MimeMessage message) message.saveChanges();
        if (part.isMimeType(mimeType)) return (String) part.getContent();
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String body = body(multipart.getBodyPart(i), mimeType);
                if (!body.isEmpty()) return body;
            }
        }
        return "";
    }
}
