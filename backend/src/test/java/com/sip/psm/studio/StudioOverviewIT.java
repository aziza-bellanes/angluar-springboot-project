package com.sip.psm.studio;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sip.psm.auction.Auction;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Dashboard aggregates: trends, two weeks of daily activity, rankings and recent bids. */
@IntegrationTest
class StudioOverviewIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;

    @Test
    void overviewExposesChartAndTableData() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("1000"), new BigDecimal("100"));
        mvc.perform(post("/api/auctions/" + auction.getId() + "/bids")
                        .header(HttpHeaders.AUTHORIZATION, fixtures.bearer(RoleName.BIDDER))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1100}"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/studio/overview").header(HttpHeaders.AUTHORIZATION, fixtures.bearer(RoleName.COLLABORATEUR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bidActivity.length()").value(14))
                .andExpect(jsonPath("$.trends.bids").isNumber())
                .andExpect(jsonPath("$.auctionsByStatus.OPEN").isNumber())
                .andExpect(jsonPath("$.recentBids[0].amount").isNumber())
                .andExpect(jsonPath("$.recentBids[0].bidder").isString())
                .andExpect(jsonPath("$.topArtists[0].volume").isNumber());
    }
}
