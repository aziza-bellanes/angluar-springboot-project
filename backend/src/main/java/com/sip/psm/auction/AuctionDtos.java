package com.sip.psm.auction;

import com.sip.psm.user.User;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public final class AuctionDtos {

    private AuctionDtos() {
    }

    public record AuctionRequest(
            @NotNull Long artworkId,
            @NotNull @DecimalMin("1.00") @Digits(integer = 12, fraction = 2) BigDecimal startingPrice,
            @NotNull @DecimalMin("1.00") @Digits(integer = 12, fraction = 2) BigDecimal minimumIncrement,
            @NotNull Instant startsAt,
            @NotNull @Future Instant endsAt) {
    }

    public record PlaceBidRequest(@NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount) {
    }

    public record ArtworkRef(Long id, String slug, String title, String imageUrl, Long artistId, String artistName) {
    }

    /** Authoritative auction state, used by REST responses and WebSocket broadcasts alike. */
    public record AuctionView(Long id, AuctionStatus status, ArtworkRef artwork, BigDecimal startingPrice,
                              BigDecimal currentPrice, BigDecimal minimumIncrement, BigDecimal minimumNextBid,
                              Instant startsAt, Instant endsAt, int bidCount, Long leadingBidderId,
                              String leadingBidder, Long winnerId, String winner, long version) {

        public static AuctionView from(Auction auction) {
            var artwork = auction.getArtwork();
            var artist = artwork.getArtist();
            return new AuctionView(auction.getId(), auction.getStatus(),
                    new ArtworkRef(artwork.getId(), artwork.getSlug(), artwork.getTitle(), artwork.getImageUrl(),
                            artist.getId(), artist.getName()),
                    auction.getStartingPrice(), auction.getCurrentPrice(), auction.getMinimumIncrement(),
                    auction.minimumNextBid(), auction.getStartsAt(), auction.getEndsAt(), auction.getBidCount(),
                    idOf(auction.getLeadingBidder()), nameOf(auction.getLeadingBidder()),
                    idOf(auction.getWinner()), nameOf(auction.getWinner()), auction.getVersion());
        }
    }

    /** Bidder identity is reduced to "First L." in public views. */
    public record BidView(Long id, BigDecimal amount, Long bidderId, String bidder, Instant createdAt) {

        public static BidView from(Bid bid) {
            return new BidView(bid.getId(), bid.getAmount(), bid.getBidder().getId(),
                    bid.getBidder().displayName(), bid.getCreatedAt());
        }
    }

    public record MyBidView(Long id, BigDecimal amount, Instant createdAt, Long auctionId, AuctionStatus auctionStatus,
                            BigDecimal currentPrice, boolean leading, String artworkTitle, String artworkSlug,
                            String imageUrl) {
    }

    public enum AuctionEventType {
        BID_PLACED,
        STATUS_CHANGED,
        UPDATED
    }

    /** Message sent on {@code /topic/auctions/{id}} and {@code /topic/auctions}. */
    public record AuctionEvent(AuctionEventType type, AuctionView auction, BidView bid, Instant serverTime) {
    }

    static Long idOf(User user) {
        return user == null ? null : user.getId();
    }

    static String nameOf(User user) {
        return user == null ? null : user.displayName();
    }
}
