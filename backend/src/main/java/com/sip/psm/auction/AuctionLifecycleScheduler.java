package com.sip.psm.auction;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Opens and closes auctions on time, each one in its own locked transaction. */
@Component
public class AuctionLifecycleScheduler {

    private static final Logger log = LoggerFactory.getLogger(AuctionLifecycleScheduler.class);

    private final AuctionRepository auctions;
    private final AuctionService service;
    private final Clock clock;

    public AuctionLifecycleScheduler(AuctionRepository auctions, AuctionService service, Clock clock) {
        this.auctions = auctions;
        this.service = service;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${atelier.auction.lifecycle-interval}")
    public void advance() {
        for (Long id : auctions.findIdsDueForTransition(clock.instant())) {
            try {
                service.synchronize(id);
            } catch (RuntimeException ex) {
                log.warn("Could not advance auction {}: {}", id, ex.getMessage());
            }
        }
    }
}
