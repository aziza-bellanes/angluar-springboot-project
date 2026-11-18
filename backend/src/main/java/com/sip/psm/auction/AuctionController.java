package com.sip.psm.auction;

import com.sip.psm.auction.AuctionDtos.AuctionEvent;
import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionDtos.BidView;
import com.sip.psm.auction.AuctionDtos.PlaceBidRequest;
import com.sip.psm.common.PageResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public auction reads and bid placement (BIDDER role). */
@RestController
@RequestMapping("/api/auctions")
public class AuctionController {

    private final AuctionService auctions;
    private final BidService bids;

    public AuctionController(AuctionService auctions, BidService bids) {
        this.auctions = auctions;
        this.bids = bids;
    }

    @GetMapping
    public PageResponse<AuctionView> list(@RequestParam(required = false) Set<AuctionStatus> status,
                                          @RequestParam(required = false) Long artworkId,
                                          @PageableDefault(size = 24, sort = "endsAt", direction = Sort.Direction.ASC)
                                          Pageable pageable) {
        return auctions.list(status, artworkId, pageable);
    }

    @GetMapping("/{id}")
    public AuctionView get(@PathVariable Long id) {
        return auctions.get(id);
    }

    @GetMapping("/{id}/bids")
    public PageResponse<BidView> bids(@PathVariable Long id, @PageableDefault(size = 20) Pageable pageable) {
        return auctions.bids(id, pageable);
    }

    @PostMapping("/{id}/bids")
    @ResponseStatus(HttpStatus.CREATED)
    public AuctionEvent placeBid(@PathVariable Long id, @Valid @RequestBody PlaceBidRequest request,
                                 Principal principal) {
        return bids.placeBid(id, request.amount(), principal.getName());
    }
}
