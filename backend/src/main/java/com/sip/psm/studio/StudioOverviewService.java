package com.sip.psm.studio;

import com.sip.psm.artist.ArtistRepository;
import com.sip.psm.artwork.ArtworkRepository;
import com.sip.psm.artwork.ArtworkStatus;
import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.auction.AuctionStatus;
import com.sip.psm.auction.BidRepository;
import com.sip.psm.exhibition.ExhibitionRepository;
import com.sip.psm.user.UserRepository;
import java.util.EnumSet;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StudioOverviewService {

    private final ArtistRepository artists;
    private final ExhibitionRepository exhibitions;
    private final ArtworkRepository artworks;
    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final UserRepository users;

    public StudioOverviewService(ArtistRepository artists, ExhibitionRepository exhibitions,
                                 ArtworkRepository artworks, AuctionRepository auctions, BidRepository bids,
                                 UserRepository users) {
        this.artists = artists;
        this.exhibitions = exhibitions;
        this.artworks = artworks;
        this.auctions = auctions;
        this.bids = bids;
        this.users = users;
    }

    public StudioOverview overview() {
        var endingSoon = auctions.search(EnumSet.of(AuctionStatus.OPEN), null,
                PageRequest.of(0, 5, Sort.by("endsAt"))).map(AuctionView::from).getContent();
        return new StudioOverview(artists.count(), exhibitions.count(),
                artworks.countByStatus(ArtworkStatus.PUBLISHED), artworks.countByStatus(ArtworkStatus.DRAFT),
                auctions.countByStatus(AuctionStatus.OPEN), auctions.countByStatus(AuctionStatus.SCHEDULED),
                auctions.countByStatus(AuctionStatus.CLOSED), bids.count(), users.count(),
                exhibitions.totalBudget(), endingSoon);
    }
}
