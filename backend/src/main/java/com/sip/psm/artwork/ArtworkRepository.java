package com.sip.psm.artwork;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArtworkRepository extends JpaRepository<Artwork, Long> {

    boolean existsByCreatedById(Long userId);

    @EntityGraph(attributePaths = {"artist", "exhibition"})
    Optional<Artwork> findBySlugAndStatus(String slug, ArtworkStatus status);

    @EntityGraph(attributePaths = {"artist", "exhibition"})
    Optional<Artwork> findWithRelationsById(Long id);

    boolean existsBySlug(String slug);

    long countByStatus(ArtworkStatus status);

    @EntityGraph(attributePaths = {"artist", "exhibition"})
    @Query("""
            select a from Artwork a
            where (:status is null or a.status = :status)
              and (:artistId is null or a.artist.id = :artistId)
              and (:exhibitionId is null or a.exhibition.id = :exhibitionId)
              and (:medium is null or lower(a.medium) = lower(:medium))
              and (:query is null or lower(a.title) like lower(concat('%', :query, '%'))
                   or lower(a.artist.name) like lower(concat('%', :query, '%')))
            """)
    Page<Artwork> search(@Param("query") String query, @Param("artistId") Long artistId,
                         @Param("exhibitionId") Long exhibitionId, @Param("medium") String medium,
                         @Param("status") ArtworkStatus status, Pageable pageable);
}
