package com.sip.psm.auction;

import java.math.BigDecimal;

/** Immutable settlement snapshot, safe to consume after the transaction has committed. */
public record AuctionResultEvent(Long auctionId, String artworkTitle, String artistName,
                                 AuctionStatus status, BigDecimal currentPrice,
                                 Recipient winner, Recipient leadingBidder) {

    public record Recipient(Long userId, String fullName, String email) {
    }
}
