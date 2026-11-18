package com.sip.psm.auction;

import java.math.BigDecimal;
import java.time.Instant;

/** Immutable bid notification snapshot; contains no managed entities or credentials. */
public record BidAcceptedEvent(Long auctionId, String artworkTitle, String artistName,
                               BigDecimal amount, Instant endsAt, Recipient bidder,
                               Recipient previousLeader) {
    public record Recipient(Long userId, String fullName, String email) {
    }
}
