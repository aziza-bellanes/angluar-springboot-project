package com.sip.psm.account;

import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionDtos.MyBidView;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.auction.Bid;
import com.sip.psm.auction.BidRepository;
import com.sip.psm.common.PageResponse;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AccountService {

    private final BidRepository bids;
    private final AuctionRepository auctions;

    public AccountService(BidRepository bids, AuctionRepository auctions) {
        this.bids = bids;
        this.auctions = auctions;
    }

    public PageResponse<MyBidView> bids(String email, Pageable pageable) {
        return PageResponse.of(bids.findByBidderEmailIgnoreCaseOrderByCreatedAtDesc(email, pageable),
                AccountService::toView);
    }

    public List<AuctionView> wins(String email) {
        return auctions.findByWinnerEmailIgnoreCaseOrderByEndsAtDesc(email).stream().map(AuctionView::from).toList();
    }

    private static MyBidView toView(Bid bid) {
        var auction = bid.getAuction();
        var artwork = auction.getArtwork();
        boolean leading = auction.getLeadingBidder() != null
                && Objects.equals(auction.getLeadingBidder().getId(), bid.getBidder().getId())
                && auction.getCurrentPrice().compareTo(bid.getAmount()) == 0;
        return new MyBidView(bid.getId(), bid.getAmount(), bid.getCreatedAt(), auction.getId(), auction.getStatus(),
                auction.getCurrentPrice(), leading, artwork.getTitle(), artwork.getSlug(), artwork.getImageUrl());
    }
}
