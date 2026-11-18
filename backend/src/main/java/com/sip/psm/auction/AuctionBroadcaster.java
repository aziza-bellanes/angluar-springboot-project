package com.sip.psm.auction;

import com.sip.psm.auction.AuctionDtos.AuctionEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Pushes auction changes to STOMP subscribers only after the database transaction has committed,
 * so clients never see a price that was rolled back.
 */
@Component
public class AuctionBroadcaster {

    public static final String TOPIC = "/topic/auctions";

    private final SimpMessagingTemplate messaging;

    public AuctionBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAuctionEvent(AuctionEvent event) {
        messaging.convertAndSend(TOPIC + "/" + event.auction().id(), event);
        messaging.convertAndSend(TOPIC, event);
    }
}
