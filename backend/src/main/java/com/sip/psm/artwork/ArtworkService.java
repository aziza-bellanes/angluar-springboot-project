package com.sip.psm.artwork;

import com.sip.psm.artist.Artist;
import com.sip.psm.artist.ArtistService;
import com.sip.psm.artwork.ArtworkDtos.ArtworkCard;
import com.sip.psm.artwork.ArtworkDtos.ArtworkDetail;
import com.sip.psm.artwork.ArtworkDtos.ArtworkRequest;
import com.sip.psm.artwork.ArtworkDtos.ArtworkResponse;
import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.common.PageResponse;
import com.sip.psm.common.Slugs;
import com.sip.psm.exhibition.Exhibition;
import com.sip.psm.exhibition.ExhibitionService;
import com.sip.psm.user.UserService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Artwork catalogue: public browsing of published works and studio management. */
@Service
@Transactional
public class ArtworkService {

    private final ArtworkRepository artworks;
    private final ArtistService artists;
    private final ExhibitionService exhibitions;
    private final UserService users;

    public ArtworkService(ArtworkRepository artworks, ArtistService artists, ExhibitionService exhibitions,
                          UserService users) {
        this.artworks = artworks;
        this.artists = artists;
        this.exhibitions = exhibitions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArtworkCard> listPublic(String query, Long artistId, Long exhibitionId, String medium,
                                                Pageable pageable) {
        return PageResponse.of(artworks.search(normalize(query), artistId, exhibitionId, normalize(medium),
                ArtworkStatus.PUBLISHED, pageable), ArtworkCard::from);
    }

    @Transactional(readOnly = true)
    public ArtworkDetail getPublicBySlug(String slug) {
        return artworks.findBySlugAndStatus(slug, ArtworkStatus.PUBLISHED)
                .map(ArtworkDetail::from)
                .orElseThrow(() -> new NotFoundException("Artwork", slug));
    }

    @Transactional(readOnly = true)
    public PageResponse<ArtworkResponse> listForStudio(String query, Long artistId, ArtworkStatus status,
                                                       Pageable pageable) {
        return PageResponse.of(artworks.search(normalize(query), artistId, null, null, status, pageable),
                ArtworkResponse::from);
    }

    @Transactional(readOnly = true)
    public ArtworkResponse getForStudio(Long id) {
        return ArtworkResponse.from(require(id));
    }

    public ArtworkResponse create(ArtworkRequest request, String actorEmail) {
        Artwork artwork = new Artwork();
        apply(artwork, request);
        artwork.setSlug(uniqueSlug(request.title()));
        artwork.setCreatedBy(users.requireByEmail(actorEmail));
        return ArtworkResponse.from(artworks.save(artwork));
    }

    /** The slug is kept stable on update so that public links do not break. */
    public ArtworkResponse update(Long id, ArtworkRequest request) {
        Artwork artwork = require(id);
        apply(artwork, request);
        return ArtworkResponse.from(artworks.saveAndFlush(artwork));
    }

    /** Deleting an artwork referenced by an auction is refused by the database (HTTP 409). */
    public void delete(Long id) {
        artworks.delete(require(id));
        artworks.flush();
    }

    @Transactional(readOnly = true)
    public Artwork require(Long id) {
        return artworks.findWithRelationsById(id).orElseThrow(() -> new NotFoundException("Artwork", id));
    }

    private void apply(Artwork artwork, ArtworkRequest request) {
        Artist artist = artists.require(request.artistId());
        Exhibition exhibition = null;
        if (request.exhibitionId() != null) {
            exhibition = exhibitions.require(request.exhibitionId());
            if (!exhibition.getArtist().getId().equals(artist.getId())) {
                throw new BusinessRuleException("exhibition_artist_mismatch",
                        "The exhibition belongs to a different artist than the artwork");
            }
        }
        artwork.setTitle(request.title().trim());
        artwork.setDescription(request.description());
        artwork.setYearCreated(request.yearCreated());
        artwork.setMedium(request.medium());
        artwork.setDimensions(request.dimensions());
        artwork.setImageUrl(request.imageUrl());
        artwork.setImageCredit(request.imageCredit());
        artwork.setEstimate(request.estimate());
        artwork.setStatus(request.status() == null ? ArtworkStatus.PUBLISHED : request.status());
        artwork.setArtist(artist);
        artwork.setExhibition(exhibition);
    }

    private String uniqueSlug(String title) {
        String base = Slugs.of(title);
        String slug = base;
        int suffix = 2;
        while (artworks.existsBySlug(slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
