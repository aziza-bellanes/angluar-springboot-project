package com.sip.psm.auction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Many collectors bid the same amount at the same instant: the row lock must let exactly one win
 * and the stored state must stay consistent.
 */
@IntegrationTest
class ConcurrentBiddingIT {

    private static final int BIDDERS = 20;

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;
    @Autowired
    AuctionRepository auctions;
    @Autowired
    BidRepository bids;

    @Test
    void onlyOneOfManySimultaneousEqualBidsIsAccepted() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("500.00"), new BigDecimal("50.00"));
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < BIDDERS; i++) {
            tokens.add(fixtures.bearer(RoleName.BIDDER));
        }

        List<Integer> statuses = submitSimultaneously(auction.getId(), tokens, "500.00");

        assertThat(statuses).filteredOn(status -> status == 201).hasSize(1);
        assertThat(statuses).filteredOn(status -> status == 409).hasSize(BIDDERS - 1);
        Auction stored = auctions.findById(auction.getId()).orElseThrow();
        assertThat(stored.getCurrentPrice()).isEqualByComparingTo("500.00");
        assertThat(stored.getBidCount()).isEqualTo(1);
        assertThat(bids.findByAuctionIdOrderByAmountDesc(auction.getId(),
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements()).isEqualTo(1);
    }

    private List<Integer> submitSimultaneously(Long auctionId, List<String> tokens, String amount) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tokens.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (String token : tokens) {
                Callable<Integer> call = () -> {
                    start.await();
                    return mvc.perform(post("/api/auctions/{id}/bids", auctionId)
                                    .header("Authorization", token)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"amount\":" + amount + "}"))
                            .andReturn().getResponse().getStatus();
                };
                futures.add(pool.submit(call));
            }
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }
            return statuses;
        } finally {
            pool.shutdownNow();
        }
    }
}
