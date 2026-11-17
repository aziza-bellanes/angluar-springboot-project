package com.sip.psm.studio;

import com.sip.psm.auction.AuctionDtos.AuctionView;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Data behind the studio dashboard, laid out like the Argon template: header KPI cards with weekly
 * trends, an activity line chart, a status bar chart, a recent-activity table and a ranking table.
 */
public record StudioOverview(
        long artists,
        long exhibitions,
        long publishedArtworks,
        long draftArtworks,
        long openAuctions,
        long scheduledAuctions,
        long closedAuctions,
        long bids,
        long users,
        BigDecimal exhibitionBudget,
        Trends trends,
        List<DailyActivity> bidActivity,
        Map<String, Long> auctionsByStatus,
        List<ArtistRanking> topArtists,
        List<RecentBid> recentBids,
        List<AuctionView> endingSoon) {

    /** Counts for the last seven days compared with the seven days before. */
    public record Trends(long newArtists, long newArtistsPrevious, long newExhibitions, long newExhibitionsPrevious,
                         long bids, long bidsPrevious, BigDecimal bidVolume, BigDecimal bidVolumePrevious,
                         long newUsers, long newUsersPrevious) {
    }

    public record DailyActivity(LocalDate day, long bids, BigDecimal volume) {
    }

    public record ArtistRanking(Long artistId, String name, long bids, BigDecimal volume) {
    }

    public record RecentBid(Long auctionId, String artworkTitle, String imageUrl, String bidder, BigDecimal amount,
                            Instant createdAt) {
    }
}
