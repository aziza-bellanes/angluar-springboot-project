package com.sip.psm.account;

import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionDtos.MyBidView;
import com.sip.psm.common.PageResponse;
import java.security.Principal;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in collector's own bidding activity. */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

    @GetMapping("/bids")
    public PageResponse<MyBidView> bids(Principal principal, @PageableDefault(size = 20) Pageable pageable) {
        return service.bids(principal.getName(), pageable);
    }

    @GetMapping("/wins")
    public List<AuctionView> wins(Principal principal) {
        return service.wins(principal.getName());
    }
}
