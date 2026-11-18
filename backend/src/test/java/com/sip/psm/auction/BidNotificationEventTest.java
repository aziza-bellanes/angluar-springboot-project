package com.sip.psm.auction;

import com.sip.psm.artist.Artist;
import com.sip.psm.artwork.Artwork;
import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.config.AtelierProperties;
import com.sip.psm.user.User;
import com.sip.psm.user.UserService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BidNotificationEventTest {
    private final AuctionRepository auctions = mock(AuctionRepository.class);
    private final BidRepository bids = mock(BidRepository.class);
    private final UserService users = mock(UserService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final Instant now = Instant.parse("2026-11-18T12:00:00Z");
    private final Auction auction = new Auction();
    private final User previous = user(1L, "Previous");
    private final User bidder = user(2L, "New");
    private final BidService service = new BidService(auctions, bids, users, events,
            Clock.fixed(now, ZoneOffset.UTC), new AtelierProperties(null, null, null, null,
            new AtelierProperties.Auction(Duration.ofMinutes(2), Duration.ofHours(1)), false));

    @BeforeEach
    void setup() {
        Artist artist = new Artist();
        artist.setName("Artist");
        Artwork artwork = new Artwork();
        artwork.setTitle("Artwork");
        artwork.setArtist(artist);
        auction.setId(5L);
        auction.setArtwork(artwork);
        auction.setStartingPrice(new BigDecimal("100"));
        auction.setCurrentPrice(new BigDecimal("100"));
        auction.setMinimumIncrement(BigDecimal.TEN);
        auction.setBidCount(1);
        auction.setLeadingBidder(previous);
        auction.setStartsAt(now.minusSeconds(60));
        auction.setEndsAt(now.plusSeconds(30));
        when(users.requireByEmail("New@example.com")).thenReturn(bidder);
        when(auctions.findByIdForUpdate(5L)).thenReturn(Optional.of(auction));
        lenient().when(bids.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void capturesDisplacedLeaderAndExtendedDeadline() {
        service.placeBid(5L, new BigDecimal("110"), bidder.getEmail());
        verify(events).publishEvent(new BidAcceptedEvent(5L, "Artwork", "Artist", new BigDecimal("110"),
                now.plusSeconds(120), new BidAcceptedEvent.Recipient(2L, "New Bidder", "New@example.com"),
                new BidAcceptedEvent.Recipient(1L, "Previous Bidder", "Previous@example.com")));
    }

    @Test
    void rejectedBidPublishesNothing() {
        assertThatThrownBy(() -> service.placeBid(5L, new BigDecimal("101"), bidder.getEmail()))
                .isInstanceOf(BusinessRuleException.class);
        verifyNoInteractions(events, bids);
    }

    private static User user(Long id, String name) {
        User user = new User();
        user.setId(id);
        user.setFirstName(name);
        user.setLastName("Bidder");
        user.setEmail(name + "@example.com");
        return user;
    }
}
