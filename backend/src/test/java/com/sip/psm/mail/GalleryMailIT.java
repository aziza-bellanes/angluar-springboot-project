package com.sip.psm.mail;

import com.sip.psm.artist.ArtistDtos.ArtistRequest;
import com.sip.psm.artist.ArtistService;
import com.sip.psm.auction.*;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.*;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Exercises real service transactions: notifications require AFTER_COMMIT, with no fallback execution. */
@IntegrationTest
class GalleryMailIT {
    @Autowired TestFixtures fixtures;
    @Autowired UserService users;
    @Autowired ArtistService artists;
    @Autowired BidService bids;
    @Autowired AuctionService auctions;
    @Autowired AuctionRepository auctionRepository;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean JavaMailSender mailSender;
    @Value("${atelier.mail.admin-address}") String admin;
    private final ConcurrentLinkedQueue<MimeMessage> sent = new ConcurrentLinkedQueue<>();

    @BeforeEach
    void transport() {
        when(mailSender.createMimeMessage()).thenAnswer(call -> new MimeMessage(Session.getInstance(new Properties())));
        doAnswer(call -> { sent.add(call.getArgument(0)); return null; }).when(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void adminCreatedEnabledUserGetsWelcomeAndAdminNotification() {
        String email = email();
        users.create(request(email, true));
        expect(email, "Welcome");
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> body(message).contains(email)).map(this::to))
                        .containsExactlyInAnyOrder(email, admin));
    }

    @Test
    void disabledAccountAndRolledBackCreationDoNotSend() {
        String disabled = email();
        String rolledBack = email();
        users.create(request(disabled, false));
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            users.create(request(rolledBack, true));
            status.setRollbackOnly();
        });
        await().during(Duration.ofMillis(400)).atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> body(message).contains(disabled)
                        || body(message).contains(rolledBack))).isEmpty());
    }

    @Test
    void artistCreationAndChangedAddressWelcomeOnlyNewContacts() {
        User actor = fixtures.user(RoleName.ADMIN);
        String initial = email();
        String updated = email();
        var contact = artists.create(artist(initial), actor.getEmail());
        expect(initial, "artist connection");
        artists.update(contact.id(), artist(initial.toUpperCase()));
        artists.update(contact.id(), artist(updated));
        expect(updated, "artist connection");
        await().during(Duration.ofMillis(300)).atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> to(message).equalsIgnoreCase(initial))).hasSize(1));
    }

    @Test
    void acceptedBidsNotifyBidderAndDisplacedLeader() {
        Auction auction = fixtures.openAuction(new BigDecimal("100"), BigDecimal.TEN);
        User first = fixtures.user(RoleName.BIDDER);
        User second = fixtures.user(RoleName.BIDDER);
        bids.placeBid(auction.getId(), new BigDecimal("100"), first.getEmail());
        expect(first.getEmail(), "Bid received");
        bids.placeBid(auction.getId(), new BigDecimal("110"), second.getEmail());
        expect(second.getEmail(), "Bid received");
        expect(first.getEmail(), "outbid");
    }

    @Test
    void closingWithWinnerNotifiesWinnerAndAdminOnce() {
        Auction auction = fixtures.openAuction(new BigDecimal("100"), BigDecimal.TEN);
        User winner = fixtures.user(RoleName.BIDDER);
        bids.placeBid(auction.getId(), new BigDecimal("100"), winner.getEmail());
        expire(auction.getId());
        auctions.synchronize(auction.getId());
        auctions.synchronize(auction.getId());
        expect(winner.getEmail(), "You won");
        expectResult(auction.getId(), "Winning bid recorded");
        await().during(Duration.ofMillis(300)).atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> to(message).equals(winner.getEmail())
                        && subject(message).contains("You won"))).hasSize(1));
    }

    @Test
    void closingWithoutBidsNotifiesAdmin() {
        Auction auction = fixtures.openAuction(new BigDecimal("100"), BigDecimal.TEN);
        expire(auction.getId());
        auctions.synchronize(auction.getId());
        expectResult(auction.getId(), "Closed without bids");
    }

    @Test
    void cancellingNotifiesLeadingBidderAndAdmin() {
        Auction auction = fixtures.openAuction(new BigDecimal("100"), BigDecimal.TEN);
        User leader = fixtures.user(RoleName.BIDDER);
        bids.placeBid(auction.getId(), new BigDecimal("100"), leader.getEmail());
        auctions.cancel(auction.getId());
        expect(leader.getEmail(), "Auction cancelled");
        expectResult(auction.getId(), "Cancelled");
    }

    private void expire(Long id) {
        new TransactionTemplate(transactions).executeWithoutResult(status ->
                auctionRepository.findById(id).orElseThrow().setEndsAt(Instant.now().minusSeconds(5)));
    }

    private void expect(String recipient, String subject) {
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> to(message).equals(recipient)
                        && subject(message).contains(subject))).hasSize(1));
    }

    private void expectResult(Long id, String result) {
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> to(message).equals(admin)
                        && body(message).contains("Auction reference: #" + id + "\n")
                        && body(message).contains(result))).hasSize(1));
    }

    private static String email() { return "mail-" + UUID.randomUUID() + "@test.local"; }
    private static UserDtos.CreateUserRequest request(String email, boolean enabled) {
        return new UserDtos.CreateUserRequest("Mail", "Collector", email, null, TestFixtures.PASSWORD,
                Set.of(RoleName.BIDDER), null, enabled);
    }
    private static ArtistRequest artist(String email) {
        return new ArtistRequest("Mail Artist", email, null, null, null, null, null, true);
    }
    private String to(MimeMessage message) {
        try { return message.getAllRecipients()[0].toString(); }
        catch (Exception ex) { throw new AssertionError(ex); }
    }
    private static String subject(MimeMessage message) {
        try { return message.getSubject(); }
        catch (Exception ex) { throw new AssertionError(ex); }
    }
    private static String body(Part part) {
        try {
            Object content = part.getContent();
            if (content instanceof Multipart multipart) {
                StringBuilder result = new StringBuilder();
                for (int i = 0; i < multipart.getCount(); i++) result.append(body(multipart.getBodyPart(i)));
                return result.toString();
            }
            return String.valueOf(content);
        } catch (Exception ex) { throw new AssertionError(ex); }
    }
}
