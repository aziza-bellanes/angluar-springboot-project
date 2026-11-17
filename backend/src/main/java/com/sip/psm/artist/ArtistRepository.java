package com.sip.psm.artist;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArtistRepository extends JpaRepository<Artist, Long> {

    boolean existsByCreatedById(Long userId);

    @Query("""
            select a from Artist a
            where (:activeOnly = false or a.active = true)
              and (:query is null or lower(a.name) like lower(concat('%', :query, '%'))
                   or lower(a.country) like lower(concat('%', :query, '%')))
            """)
    Page<Artist> search(@Param("query") String query, @Param("activeOnly") boolean activeOnly, Pageable pageable);
}
