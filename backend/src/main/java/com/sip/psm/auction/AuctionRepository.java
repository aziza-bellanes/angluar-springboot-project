package com.sip.psm.auction;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuctionRepository extends JpaRepository<Auction, Long> {

    boolean existsByWinnerIdOrLeadingBidderId(Long winnerId, Long leadingBidderId);

    /** Row-level lock ({@code SELECT ... FOR UPDATE}) that serialises concurrent bids on one auction. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Auction a where a.id = :id")
    Optional<Auction> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"artwork", "artwork.artist", "leadingBidder", "winner"})
    @Query("select a from Auction a where a.id = :id")
    Optional<Auction> findDetailedById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"artwork", "artwork.artist", "leadingBidder", "winner"})
    @Query("""
            select a from Auction a
            where a.status in :statuses
              and (:artworkId is null or a.artwork.id = :artworkId)
            """)
    Page<Auction> search(@Param("statuses") Collection<AuctionStatus> statuses,
                         @Param("artworkId") Long artworkId, Pageable pageable);

    boolean existsByArtworkIdAndStatusIn(Long artworkId, Collection<AuctionStatus> statuses);

    @Query("""
            select a.id from Auction a
            where (a.status = com.sip.psm.auction.AuctionStatus.SCHEDULED and a.startsAt <= :now)
               or (a.status = com.sip.psm.auction.AuctionStatus.OPEN and a.endsAt <= :now)
            """)
    List<Long> findIdsDueForTransition(@Param("now") Instant now);

    long countByStatus(AuctionStatus status);

    @EntityGraph(attributePaths = {"artwork", "artwork.artist"})
    List<Auction> findByWinnerEmailIgnoreCaseOrderByEndsAtDesc(String email);
}
