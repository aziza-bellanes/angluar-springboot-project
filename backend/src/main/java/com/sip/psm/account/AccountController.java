package com.sip.psm.account;

import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionDtos.MyBidView;
import com.sip.psm.account.ProfileService.PasswordChange;
import com.sip.psm.account.ProfileService.ProfileUpdate;
import com.sip.psm.common.PageResponse;
import com.sip.psm.user.UserDtos.UserResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own profile and bidding activity. */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService service;
    private final ProfileService profiles;

    public AccountController(AccountService service, ProfileService profiles) {
        this.service = service;
        this.profiles = profiles;
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(Principal principal, @Valid @RequestBody ProfileUpdate update) {
        return profiles.update(principal.getName(), update);
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(Principal principal, @Valid @RequestBody PasswordChange change) {
        profiles.changePassword(principal.getName(), change);
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
