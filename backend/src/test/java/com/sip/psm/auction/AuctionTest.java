package com.sip.psm.auction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.user.User;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Pure domain rules of {@link Auction}, no Spring context. */
class AuctionTest {

    private static final Instant START = Instant.parse("2026-01-01T10:00:00Z");
    private static final Duration SOFT_CLOSE = Duration.ofSeconds(60);

    private Auction auction;
    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        auction = new Auction();
        auction.setStartingPrice(new BigDecimal("100.00"));
        auction.setCurrentPrice(new BigDecimal("100.00"));
        auction.setMinimumIncrement(new BigDecimal("10.00"));
        auction.setStartsAt(START);
        auction.setEndsAt(START.plus(Duration.ofHours(1)));
        alice = user(1L, "Alice", "Martin");
        bob = user(2L, "Bob", "Durand");
    }

    @Test
    void opensWhenStartTimeIsReached() {
        assertThat(auction.synchronize(START.minusSeconds(1))).isFalse();
        assertThat(auction.getStatus()).isEqualTo(AuctionStatus.SCHEDULED);
        assertThat(auction.synchronize(START)).isTrue();
        assertThat(auction.getStatus()).isEqualTo(AuctionStatus.OPEN);
    }

    @Test
    void firstBidMayEqualTheStartingPrice() {
        Bid bid = auction.placeBid(alice, new BigDecimal("100.00"), START.plusSeconds(5), SOFT_CLOSE);

        assertThat(bid.getAmount()).isEqualByComparingTo("100.00");
        assertThat(auction.getCurrentPrice()).isEqualByComparingTo("100.00");
        assertThat(auction.minimumNextBid()).isEqualByComparingTo("110.00");
        assertThat(auction.getLeadingBidder()).isSameAs(alice);
    }

    @Test
    void rejectsBidsBelowTheMinimumIncrement() {
        auction.placeBid(alice, new BigDecimal("100.00"), START.plusSeconds(5), SOFT_CLOSE);

        assertThatThrownBy(() -> auction.placeBid(bob, new BigDecimal("105.00"), START.plusSeconds(6), SOFT_CLOSE))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("110.00");
    }

    @Test
    void leaderCannotOutbidThemselves() {
        auction.placeBid(alice, new BigDecimal("100.00"), START.plusSeconds(5), SOFT_CLOSE);

        assertThatThrownBy(() -> auction.placeBid(alice, new BigDecimal("200.00"), START.plusSeconds(6), SOFT_CLOSE))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("already_leading");
    }

    @Test
    void rejectsBidsBeforeOpeningAndAfterClosing() {
        assertThatThrownBy(() -> auction.placeBid(alice, new BigDecimal("100.00"), START.minusSeconds(1), SOFT_CLOSE))
                .extracting("code").isEqualTo("auction_not_open");
        assertThatThrownBy(() -> auction.placeBid(alice, new BigDecimal("100.00"), auction.getEndsAt(), SOFT_CLOSE))
                .extracting("code").isEqualTo("auction_not_open");
    }

    @Test
    void lateBidExtendsTheAuction() {
        Instant late = auction.getEndsAt().minusSeconds(10);

        auction.placeBid(alice, new BigDecimal("100.00"), late, SOFT_CLOSE);

        assertThat(auction.getEndsAt()).isEqualTo(late.plus(SOFT_CLOSE));
    }

    @Test
    void closingRecordsTheLeadingBidderAsWinner() {
        auction.placeBid(alice, new BigDecimal("100.00"), START.plusSeconds(5), SOFT_CLOSE);
        auction.placeBid(bob, new BigDecimal("120.00"), START.plusSeconds(6), SOFT_CLOSE);

        assertThat(auction.synchronize(auction.getEndsAt())).isTrue();

        assertThat(auction.getStatus()).isEqualTo(AuctionStatus.CLOSED);
        assertThat(auction.getWinner()).isSameAs(bob);
        assertThat(auction.getBidCount()).isEqualTo(2);
    }

    @Test
    void cancelledAuctionRejectsBids() {
        auction.cancel();

        assertThatThrownBy(() -> auction.placeBid(alice, new BigDecimal("100.00"), START.plusSeconds(5), SOFT_CLOSE))
                .extracting("code").isEqualTo("auction_not_open");
    }

    private static User user(Long id, String first, String last) {
        User user = new User();
        user.setId(id);
        user.setFirstName(first);
        user.setLastName(last);
        user.setEmail(first.toLowerCase() + "@test.local");
        return user;
    }
}
