package com.sip.psm.studio;

import com.sip.psm.auction.AuctionDtos.AuctionView;
import java.math.BigDecimal;
import java.util.List;

public record StudioOverview(long artists, long exhibitions, long publishedArtworks, long draftArtworks,
                             long openAuctions, long scheduledAuctions, long closedAuctions, long bids, long users,
                             BigDecimal exhibitionBudget, List<AuctionView> endingSoon) {
}
