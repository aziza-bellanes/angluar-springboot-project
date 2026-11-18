package com.sip.psm.auction;

import com.sip.psm.auction.AuctionDtos.AuctionEvent;
import com.sip.psm.auction.AuctionDtos.AuctionEventType;
import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionDtos.BidView;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.config.AtelierProperties;
import com.sip.psm.user.User;
import com.sip.psm.user.UserService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Places bids under a pessimistic row lock: concurrent bids on the same auction are executed one
 * after another, each one re-validated against the freshly committed price.
 */
@Service
public class BidService {

    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final UserService users;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final Duration softClose;

    public BidService(AuctionRepository auctions, BidRepository bids, UserService users,
                      ApplicationEventPublisher events, Clock clock, AtelierProperties properties) {
        this.auctions = auctions;
        this.bids = bids;
        this.users = users;
        this.events = events;
        this.clock = clock;
        this.softClose = properties.auction().softClose();
    }

    @Transactional
    public AuctionEvent placeBid(Long auctionId, BigDecimal amount, String bidderEmail) {
        User bidder = users.requireByEmail(bidderEmail);
        Auction auction = auctions.findByIdForUpdate(auctionId)
                .orElseThrow(() -> new NotFoundException("Auction", auctionId));
        Instant now = clock.instant();
        Bid bid = bids.save(auction.placeBid(bidder, amount, now, softClose));
        auctions.flush();
        AuctionEvent event = new AuctionEvent(AuctionEventType.BID_PLACED, AuctionView.from(auction),
                BidView.from(bid), now);
        events.publishEvent(event);
        return event;
    }
}
