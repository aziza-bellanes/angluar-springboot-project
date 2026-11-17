package com.sip.psm.exhibition;

import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExhibitionRepository extends JpaRepository<Exhibition, Long> {

    @EntityGraph(attributePaths = "artist")
    @Query("""
            select e from Exhibition e
            where (:artistId is null or e.artist.id = :artistId)
              and (:query is null or lower(e.title) like lower(concat('%', :query, '%'))
                   or lower(e.venue) like lower(concat('%', :query, '%')))
            """)
    Page<Exhibition> search(@Param("query") String query, @Param("artistId") Long artistId, Pageable pageable);

    @Query("select coalesce(sum(e.budget), 0) from Exhibition e")
    BigDecimal totalBudget();
}
