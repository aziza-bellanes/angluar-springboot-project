package com.sip.psm.auction;

public enum AuctionStatus {
    SCHEDULED,
    OPEN,
    CLOSED,
    CANCELLED;

    public boolean isLive() {
        return this == SCHEDULED || this == OPEN;
    }
}
