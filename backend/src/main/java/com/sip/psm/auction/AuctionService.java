package com.sip.psm.auction;

import com.sip.psm.artwork.Artwork;
import com.sip.psm.artwork.ArtworkStatus;
import com.sip.psm.artwork.ArtworkService;
import com.sip.psm.auction.AuctionDtos.AuctionEvent;
import com.sip.psm.auction.AuctionDtos.AuctionEventType;
import com.sip.psm.auction.AuctionDtos.AuctionRequest;
import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionDtos.BidView;
import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.common.PageResponse;
import java.time.Clock;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Auction catalogue for visitors and auction management for administrators. */
@Service
@Transactional
public class AuctionService {

    private static final Set<AuctionStatus> LIVE = EnumSet.of(AuctionStatus.SCHEDULED, AuctionStatus.OPEN);

    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final ArtworkService artworks;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public AuctionService(AuctionRepository auctions, BidRepository bids, ArtworkService artworks,
                          ApplicationEventPublisher events, Clock clock) {
        this.auctions = auctions;
        this.bids = bids;
        this.artworks = artworks;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuctionView> list(Collection<AuctionStatus> statuses, Long artworkId, Pageable pageable) {
        Collection<AuctionStatus> filter = statuses == null || statuses.isEmpty() ? LIVE : statuses;
        return PageResponse.of(auctions.search(filter, artworkId, pageable), AuctionView::from);
    }

    @Transactional(readOnly = true)
    public AuctionView get(Long id) {
        return AuctionView.from(requireDetailed(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<BidView> bids(Long auctionId, Pageable pageable) {
        requireDetailed(auctionId);
        return PageResponse.of(bids.findByAuctionIdOrderByAmountDesc(auctionId, pageable), BidView::from);
    }

    public AuctionView create(AuctionRequest request) {
        validateWindow(request);
        Artwork artwork = artworks.require(request.artworkId());
        if (artwork.getStatus() != ArtworkStatus.PUBLISHED) {
            throw new BusinessRuleException("artwork_not_published", "Only published artworks can be auctioned");
        }
        if (auctions.existsByArtworkIdAndStatusIn(artwork.getId(), LIVE)) {
            throw new BusinessRuleException("auction_overlap", "This artwork already has a scheduled or open auction");
        }
        Auction auction = new Auction();
        auction.setArtwork(artwork);
        applyTerms(auction, request);
        auction.synchronize(clock.instant());
        auctions.saveAndFlush(auction);
        return publish(AuctionEventType.UPDATED, auction);
    }

    /** Terms can only be edited before the first bid has been accepted. */
    public AuctionView update(Long id, AuctionRequest request) {
        validateWindow(request);
        Auction auction = requireDetailed(id);
        if (!auction.getStatus().isLive() || auction.getBidCount() > 0) {
            throw new BusinessRuleException("auction_locked", "An auction can only be edited while it has no bids");
        }
        if (!auction.getArtwork().getId().equals(request.artworkId())) {
            throw new BusinessRuleException("artwork_change", "The artwork of an auction cannot be changed");
        }
        applyTerms(auction, request);
        auction.setCurrentPrice(request.startingPrice());
        auction.synchronize(clock.instant());
        auctions.saveAndFlush(auction);
        return publish(AuctionEventType.UPDATED, auction);
    }

    public AuctionView cancel(Long id) {
        Auction auction = auctions.findByIdForUpdate(id).orElseThrow(() -> new NotFoundException("Auction", id));
        auction.cancel();
        auctions.flush();
        return publish(AuctionEventType.STATUS_CHANGED, requireDetailed(id));
    }

    public void delete(Long id) {
        Auction auction = requireDetailed(id);
        if (bids.existsByAuctionId(id)) {
            throw new BusinessRuleException("auction_has_bids", "Auctions with bids cannot be deleted; cancel them instead");
        }
        auctions.delete(auction);
    }

    /** Applies time-based transitions for one auction; invoked by the lifecycle scheduler. */
    public void synchronize(Long id) {
        auctions.findByIdForUpdate(id).ifPresent(auction -> {
            if (auction.synchronize(clock.instant())) {
                auctions.flush();
                publish(AuctionEventType.STATUS_CHANGED, requireDetailed(id));
            }
        });
    }

    private Auction requireDetailed(Long id) {
        return auctions.findDetailedById(id).orElseThrow(() -> new NotFoundException("Auction", id));
    }

    private AuctionView publish(AuctionEventType type, Auction auction) {
        AuctionView view = AuctionView.from(auction);
        events.publishEvent(new AuctionEvent(type, view, null, clock.instant()));
        return view;
    }

    private static void applyTerms(Auction auction, AuctionRequest request) {
        auction.setStartingPrice(request.startingPrice());
        auction.setMinimumIncrement(request.minimumIncrement());
        auction.setStartsAt(request.startsAt());
        auction.setEndsAt(request.endsAt());
    }

    private static void validateWindow(AuctionRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new BusinessRuleException("invalid_window", "The auction must end after it starts");
        }
    }
}
