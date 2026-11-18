package com.sip.psm.auction;

import static org.assertj.core.api.Assertions.assertThat;

import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.User;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

/** Domain snapshots are recorded inside isolated, rolled-back transactions; mail runs only after commit. */
@IntegrationTest
@RecordApplicationEvents
@Transactional
class AuctionResultEventIT {

    @Autowired TestFixtures fixtures;
    @Autowired AuctionRepository auctions;
    @Autowired AuctionService service;
    @Autowired BidService bids;
    @Autowired ApplicationEvents events;

    @Test
    void closingWithBidsPublishesCompleteWinnerSnapshot() {
        Auction auction = openAuction();
        User winner = fixtures.user(RoleName.BIDDER);
        bids.placeBid(auction.getId(), new BigDecimal("100.00"), winner.getEmail());
        expire(auction);
        events.clear();

        service.synchronize(auction.getId());

        AuctionResultEvent result = onlyResult();
        assertThat(result.auctionId()).isEqualTo(auction.getId());
        assertThat(result.status()).isEqualTo(AuctionStatus.CLOSED);
        assertThat(result.artworkTitle()).isEqualTo(auction.getArtwork().getTitle());
        assertThat(result.artistName()).isEqualTo(auction.getArtwork().getArtist().getName());
        assertThat(result.currentPrice()).isEqualByComparingTo("100.00");
        assertThat(result.winner()).isEqualTo(recipient(winner));
        assertThat(result.leadingBidder()).isEqualTo(recipient(winner));
    }

    @Test
    void closingWithoutBidsPublishesResultWithoutWinner() {
        Auction auction = openAuction();
        expire(auction);
        events.clear();

        service.synchronize(auction.getId());

        AuctionResultEvent result = onlyResult();
        assertThat(result.status()).isEqualTo(AuctionStatus.CLOSED);
        assertThat(result.currentPrice()).isEqualByComparingTo("100.00");
        assertThat(result.winner()).isNull();
        assertThat(result.leadingBidder()).isNull();
    }

    @Test
    void cancellationSnapshotsLeadingBidderWithoutDeclaringAWinner() {
        Auction auction = openAuction();
        User leader = fixtures.user(RoleName.BIDDER);
        bids.placeBid(auction.getId(), new BigDecimal("100.00"), leader.getEmail());
        events.clear();

        service.cancel(auction.getId());

        AuctionResultEvent result = onlyResult();
        assertThat(result.status()).isEqualTo(AuctionStatus.CANCELLED);
        assertThat(result.winner()).isNull();
        assertThat(result.leadingBidder()).isEqualTo(recipient(leader));
        assertThat(result.currentPrice()).isEqualByComparingTo("100.00");
    }

    @Test
    void repeatedSynchronizationPublishesNoAdditionalTerminalResult() {
        Auction auction = openAuction();
        expire(auction);
        events.clear();
        service.synchronize(auction.getId());
        assertThat(events.stream(AuctionResultEvent.class)).hasSize(1);
        events.clear();

        service.synchronize(auction.getId());
        service.synchronize(auction.getId());

        assertThat(events.stream(AuctionResultEvent.class)).isEmpty();
    }

    private Auction openAuction() {
        return fixtures.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));
    }

    private void expire(Auction auction) {
        auction.setEndsAt(Instant.now().minusSeconds(5));
        auctions.saveAndFlush(auction);
    }

    private AuctionResultEvent onlyResult() {
        var results = events.stream(AuctionResultEvent.class).toList();
        assertThat(results).hasSize(1);
        return results.get(0);
    }

    private static AuctionResultEvent.Recipient recipient(User user) {
        return new AuctionResultEvent.Recipient(user.getId(),
                user.getFirstName() + " " + user.getLastName(), user.getEmail());
    }
}
