package com.sip.psm.demo;

import static org.assertj.core.api.Assertions.assertThat;

import com.sip.psm.artist.ArtistRepository;
import com.sip.psm.artwork.ArtworkRepository;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.auction.AuctionStatus;
import com.sip.psm.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

/** The demonstration gallery loads completely, with auctions in every state. */
@IntegrationTest
@TestPropertySource(properties = "atelier.demo-data=true")
class DemoDataIT {

    @Autowired
    ArtistRepository artists;
    @Autowired
    ArtworkRepository artworks;
    @Autowired
    AuctionRepository auctions;

    @Test
    void loadsCatalogueAndAuctions() {
        assertThat(artists.count()).isGreaterThanOrEqualTo(5);
        assertThat(artworks.count()).isGreaterThanOrEqualTo(24);
        assertThat(auctions.countByStatus(AuctionStatus.OPEN)).isEqualTo(6);
        assertThat(auctions.countByStatus(AuctionStatus.SCHEDULED)).isEqualTo(1);
        assertThat(auctions.countByStatus(AuctionStatus.CLOSED)).isEqualTo(1);
        assertThat(auctions.findAll()).filteredOn(a -> a.getStatus() == AuctionStatus.CLOSED)
                .allSatisfy(a -> assertThat(a.getWinner()).isNotNull());
    }
}
