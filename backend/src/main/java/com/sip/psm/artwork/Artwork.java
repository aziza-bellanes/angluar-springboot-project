package com.sip.psm.artwork;

import com.sip.psm.artist.Artist;
import com.sip.psm.common.AuditedEntity;
import com.sip.psm.exhibition.Exhibition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** A work of art by an artist, optionally shown in one of the artist's exhibitions. */
@Getter
@Setter
@Entity
@Table(name = "artworks")
public class Artwork extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 180)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 4000)
    private String description;

    @Column(name = "year_created")
    private Integer yearCreated;

    @Column(length = 120)
    private String medium;

    @Column(length = 80)
    private String dimensions;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_credit", length = 255)
    private String imageCredit;

    @Column(precision = 14, scale = 2)
    private BigDecimal estimate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ArtworkStatus status = ArtworkStatus.PUBLISHED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artist_id", nullable = false)
    private Artist artist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exhibition_id")
    private Exhibition exhibition;
}
