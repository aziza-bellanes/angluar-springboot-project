package com.sip.psm.exhibition;

import com.sip.psm.artist.Artist;
import com.sip.psm.common.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/**
 * Specification equivalent of <b>Projet</b> (id, libellé, budget, durée, description, idClient):
 * a gallery project is an exhibition staged for one artist.
 */
@Getter
@Setter
@Entity
@Table(name = "exhibitions")
public class Exhibition extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** libellé */
    @Column(nullable = false, length = 160)
    private String title;

    /** description */
    @Column(length = 4000)
    private String description;

    /** budget (internal, never exposed publicly) */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal budget;

    /** durée, in days */
    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(name = "starts_on")
    private LocalDate startsOn;

    @Column(length = 160)
    private String venue;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    /** idClient */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artist_id", nullable = false)
    private Artist artist;
}
