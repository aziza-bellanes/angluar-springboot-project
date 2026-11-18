package com.sip.psm.auction;

import com.sip.psm.artwork.Artwork;
import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import lombok.Getter;
import lombok.Setter;

/**
 * A timed English auction for one artwork. All bidding rules live here so they are applied
 * identically by the REST endpoint and the lifecycle scheduler.
 */
@Getter
@Setter
@Entity
@Table(name = "auctions")
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artwork_id")
    private Artwork artwork;

    @Column(name = "starting_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal startingPrice;

    @Column(name = "current_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "minimum_increment", nullable = false, precision = 14, scale = 2)
    private BigDecimal minimumIncrement;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AuctionStatus status = AuctionStatus.SCHEDULED;

    @Column(name = "bid_count", nullable = false)
    private int bidCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leading_bidder_id")
    private User leadingBidder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private long version;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (currentPrice == null) {
            currentPrice = startingPrice;
        }
    }

    /** The lowest amount the next bid must reach. */
    public BigDecimal minimumNextBid() {
        return bidCount == 0 ? startingPrice : currentPrice.add(minimumIncrement);
    }

    /**
     * Aligns the stored status with the clock: opens a scheduled auction whose start has passed and
     * closes an open auction whose end has passed, recording the leading bidder as winner.
     *
     * @return {@code true} when the status changed
     */
    public boolean synchronize(Instant now) {
        AuctionStatus before = status;
        if (status == AuctionStatus.SCHEDULED && !now.isBefore(startsAt)) {
            status = AuctionStatus.OPEN;
        }
        if (status == AuctionStatus.OPEN && !now.isBefore(endsAt)) {
            status = AuctionStatus.CLOSED;
            winner = leadingBidder;
        }
        return status != before;
    }

    /**
     * Validates and records a bid. Must be called on a row locked with {@code PESSIMISTIC_WRITE}.
     * A bid in the final {@code softClose} window extends the end so last-second sniping is pointless.
     */
    public Bid placeBid(User bidder, BigDecimal amount, Instant now, Duration softClose) {
        synchronize(now);
        if (status != AuctionStatus.OPEN) {
            throw new BusinessRuleException("auction_not_open", "This auction is not accepting bids");
        }
        if (leadingBidder != null && Objects.equals(leadingBidder.getId(), bidder.getId())) {
            throw new BusinessRuleException("already_leading", "You already hold the highest bid");
        }
        BigDecimal minimum = minimumNextBid();
        if (amount.compareTo(minimum) < 0) {
            throw new BusinessRuleException("bid_too_low", "The minimum bid is now " + minimum.toPlainString());
        }
        currentPrice = amount;
        leadingBidder = bidder;
        bidCount++;
        Instant softCloseLimit = now.plus(softClose);
        if (endsAt.isBefore(softCloseLimit)) {
            endsAt = softCloseLimit;
        }
        return new Bid(this, bidder, amount, now);
    }

    public void cancel() {
        if (!status.isLive()) {
            throw new BusinessRuleException("auction_finished", "Only scheduled or open auctions can be cancelled");
        }
        status = AuctionStatus.CANCELLED;
    }
}
