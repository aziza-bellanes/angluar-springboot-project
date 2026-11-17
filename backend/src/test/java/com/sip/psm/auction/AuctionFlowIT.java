package com.sip.psm.auction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sip.psm.artwork.Artwork;
import com.sip.psm.artwork.ArtworkStatus;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.User;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** End-to-end auction lifecycle: creation rules, bidding rules, cancellation, deletion and closing. */
@IntegrationTest
class AuctionFlowIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;
    @Autowired
    AuctionRepository auctions;
    @Autowired
    AuctionLifecycleScheduler scheduler;

    @Test
    void secondLiveAuctionForTheSameArtworkIsRejected() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);
        Artwork artwork = fixtures.artwork();

        createAuction(admin, artwork.getId(), Instant.now().plusSeconds(3600), Instant.now().plusSeconds(7200))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
        createAuction(admin, artwork.getId(), Instant.now().plusSeconds(3600), Instant.now().plusSeconds(7200))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("auction_overlap"));
    }

    @Test
    void auctionEndingBeforeItStartsIsRejectedAsInvalidWindow() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);
        Instant start = Instant.now().plus(Duration.ofHours(5));

        createAuction(admin, fixtures.artwork().getId(), start, Instant.now().plus(Duration.ofHours(2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("invalid_window"));
    }

    @Test
    void auctionEndingInThePastFailsValidation() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);

        createAuction(admin, fixtures.artwork().getId(), Instant.now().minusSeconds(7200),
                Instant.now().minusSeconds(3600))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.endsAt").exists());
    }

    @Test
    void draftArtworkCannotBeAuctioned() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);

        createAuction(admin, fixtures.artwork(ArtworkStatus.DRAFT).getId(),
                Instant.now().plusSeconds(60), Instant.now().plusSeconds(3600))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("artwork_not_published"));
    }

    @Test
    void biddingRulesAreEnforcedAndBidsAreListedHighestFirstWithMaskedNames() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("500.00"), new BigDecimal("50.00"));
        User first = fixtures.user(RoleName.BIDDER);
        User second = fixtures.user(RoleName.BIDDER);

        bid(auction.getId(), fixtures.bearer(first), "500.00")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.auction.currentPrice").value(500.00))
                .andExpect(jsonPath("$.auction.minimumNextBid").value(550.00))
                .andExpect(jsonPath("$.auction.bidCount").value(1));
        bid(auction.getId(), fixtures.bearer(second), "520.00")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("bid_too_low"));
        bid(auction.getId(), fixtures.bearer(first), "700.00")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("already_leading"));
        bid(auction.getId(), fixtures.bearer(second), "550.00")
                .andExpect(status().isCreated());

        mvc.perform(get("/api/auctions/{id}/bids", auction.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].amount").value(550.00))
                .andExpect(jsonPath("$.content[1].amount").value(500.00))
                .andExpect(jsonPath("$.content[0].bidder").value(second.displayName()));
    }

    @Test
    void accountBidsReportWhichBidIsLeading() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));
        User leader = fixtures.user(RoleName.BIDDER);
        User outbid = fixtures.user(RoleName.BIDDER);
        bid(auction.getId(), fixtures.bearer(outbid), "100.00").andExpect(status().isCreated());
        bid(auction.getId(), fixtures.bearer(leader), "110.00").andExpect(status().isCreated());

        mvc.perform(get("/api/account/bids").header("Authorization", fixtures.bearer(leader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].auctionId").value(auction.getId()))
                .andExpect(jsonPath("$.content[0].leading").value(true));
        mvc.perform(get("/api/account/bids").header("Authorization", fixtures.bearer(outbid)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].leading").value(false))
                .andExpect(jsonPath("$.content[0].currentPrice").value(110.00));
    }

    @Test
    void cancelledAuctionRejectsBidsAndAuctionWithBidsCannotBeDeleted() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);
        Auction auction = fixtures.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));
        bid(auction.getId(), fixtures.bearer(RoleName.BIDDER), "100.00").andExpect(status().isCreated());

        mvc.perform(delete("/api/studio/auctions/{id}", auction.getId()).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("auction_has_bids"));
        mvc.perform(post("/api/studio/auctions/{id}/cancel", auction.getId()).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        bid(auction.getId(), fixtures.bearer(RoleName.BIDDER), "500.00")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("auction_not_open"));
    }

    @Test
    void auctionWithoutBidsCanBeDeleted() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));

        mvc.perform(delete("/api/studio/auctions/{id}", auction.getId())
                        .header("Authorization", fixtures.bearer(RoleName.ADMIN)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auctions/{id}", auction.getId())).andExpect(status().isNotFound());
    }

    @Test
    void lifecycleSchedulerClosesAnExpiredAuctionAndRecordsTheWinner() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));
        User winner = fixtures.user(RoleName.BIDDER);
        bid(auction.getId(), fixtures.bearer(winner), "100.00").andExpect(status().isCreated());
        Auction stored = auctions.findById(auction.getId()).orElseThrow();
        stored.setEndsAt(Instant.now().minusSeconds(5));
        auctions.save(stored);

        scheduler.advance();

        Auction closed = auctions.findDetailedById(auction.getId()).orElseThrow();
        assertThat(closed.getStatus()).isEqualTo(AuctionStatus.CLOSED);
        assertThat(closed.getWinner().getId()).isEqualTo(winner.getId());
        mvc.perform(get("/api/account/wins").header("Authorization", fixtures.bearer(winner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(hasItem(auction.getId().intValue())))
                .andExpect(jsonPath("$[0].status").value("CLOSED"));
    }

    private ResultActions bid(Long auctionId, String token, String amount)
            throws Exception {
        return mvc.perform(post("/api/auctions/{id}/bids", auctionId).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":" + amount + "}"));
    }

    private ResultActions createAuction(String token, Long artworkId,
                                                                             Instant startsAt, Instant endsAt)
            throws Exception {
        String body = "{\"artworkId\":%d,\"startingPrice\":100.00,\"minimumIncrement\":10.00,\"startsAt\":\"%s\",\"endsAt\":\"%s\"}"
                .formatted(artworkId, startsAt, endsAt);
        return mvc.perform(post("/api/studio/auctions").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
