package com.sip.psm.auction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BidRepository extends JpaRepository<Bid, Long> {

    @EntityGraph(attributePaths = "bidder")
    Page<Bid> findByAuctionIdOrderByAmountDesc(Long auctionId, Pageable pageable);

    @EntityGraph(attributePaths = {"auction", "auction.artwork"})
    Page<Bid> findByBidderEmailIgnoreCaseOrderByCreatedAtDesc(String email, Pageable pageable);

    boolean existsByAuctionId(Long auctionId);

    boolean existsByBidderId(Long bidderId);
}
