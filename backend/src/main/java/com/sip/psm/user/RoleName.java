package com.sip.psm.user;

/**
 * Application roles. ADMIN and COLLABORATEUR come from the specification;
 * BIDDER is the collector account introduced for live auctions.
 */
public enum RoleName {
    ADMIN,
    COLLABORATEUR,
    BIDDER;

    public String authority() {
        return "ROLE_" + name();
    }
}
