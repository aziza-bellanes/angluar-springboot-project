import com.sip.psm.mail.*;
import com.sip.psm.auth.*;
import com.sip.psm.artist.ArtistContactCreatedEvent;
import com.sip.psm.auction.*;
import com.sip.psm.config.AtelierProperties;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/** Renders synthetic correspondence with production templates. No database, network or test suite. */
class EmailPreviews {
    public static void main(String[] args) throws Exception {
        Path output = Path.of(args[0]);
        Files.createDirectories(output);
        Queue<String> names = new ArrayDeque<>(List.of("welcome", "admin-account", "artist-contact", "admin-contact",
                "bid-confirmation", "outbid", "winner", "admin-result", "admin-no-bids", "cancelled", "admin-cancelled"));
        var transport = new JavaMailSenderImpl() {
            @Override public void send(MimeMessage message) {
                try { Files.writeString(output.resolve(names.remove() + ".html"), html(message)); }
                catch (Exception ex) { throw new IllegalStateException(ex); }
            }
        };
        var properties = new AtelierProperties(null, null,
                new AtelierProperties.Mail("admin@example.test", "gallery@example.test", "https://gallery.example.test"),
                null, null, false);
        var sender = new GalleryMailSender(transport, new GalleryMailTemplate(properties), properties);
        new RegistrationMailListener(sender, properties).onUserRegistered(new UserRegisteredEvent(42L, "Inès Moreau", "ines@example.test"));
        var listener = new GalleryActivityMailListener(sender, properties);
        listener.onArtistContact(new ArtistContactCreatedEvent(22L, "Mira Laurent", "mira@example.test"));
        listener.onBidAccepted(new BidAcceptedEvent(12L, "Composition in Blue", "Mira Laurent", new BigDecimal("1250.00"),
                Instant.parse("2026-12-01T18:30:00Z"), new BidAcceptedEvent.Recipient(8L, "Inès Moreau", "ines@example.test"),
                new BidAcceptedEvent.Recipient(9L, "Camille Martin", "camille@example.test")));
        var winner = new AuctionResultEvent.Recipient(8L, "Inès Moreau", "ines@example.test");
        listener.onAuctionResult(new AuctionResultEvent(12L, "Composition in Blue", "Mira Laurent", AuctionStatus.CLOSED,
                new BigDecimal("1250.00"), winner, winner));
        listener.onAuctionResult(new AuctionResultEvent(13L, "Quiet Garden", "Mira Laurent", AuctionStatus.CLOSED,
                new BigDecimal("100.00"), null, null));
        listener.onAuctionResult(new AuctionResultEvent(14L, "Quiet Garden", "Mira Laurent", AuctionStatus.CANCELLED,
                new BigDecimal("100.00"), null, winner));
        System.out.println("Rendered 11 synthetic gallery messages; no network or tests executed.");
    }
    private static String html(Part part) throws Exception {
        Object content = part.getContent();
        if (part.isMimeType("text/html") && content instanceof String text) return text;
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String found = html(multipart.getBodyPart(i));
                if (!found.isEmpty()) return found;
            }
        }
        return "";
    }
}
