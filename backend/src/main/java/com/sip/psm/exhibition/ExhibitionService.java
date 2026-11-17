package com.sip.psm.exhibition;

import com.sip.psm.artist.ArtistService;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.common.PageResponse;
import com.sip.psm.exhibition.ExhibitionDtos.ExhibitionRequest;
import com.sip.psm.exhibition.ExhibitionDtos.ExhibitionResponse;
import com.sip.psm.exhibition.ExhibitionDtos.ExhibitionSummary;
import com.sip.psm.user.UserService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Exhibition catalogue (specification "Projet" CRUD). */
@Service
@Transactional
public class ExhibitionService {

    private final ExhibitionRepository exhibitions;
    private final ArtistService artists;
    private final UserService users;

    public ExhibitionService(ExhibitionRepository exhibitions, ArtistService artists, UserService users) {
        this.exhibitions = exhibitions;
        this.artists = artists;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public PageResponse<ExhibitionSummary> listPublic(String query, Long artistId, Pageable pageable) {
        return PageResponse.of(exhibitions.search(normalize(query), artistId, pageable), ExhibitionSummary::from);
    }

    @Transactional(readOnly = true)
    public ExhibitionSummary getPublic(Long id) {
        return ExhibitionSummary.from(require(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<ExhibitionResponse> listForStudio(String query, Long artistId, Pageable pageable) {
        return PageResponse.of(exhibitions.search(normalize(query), artistId, pageable), ExhibitionResponse::from);
    }

    @Transactional(readOnly = true)
    public ExhibitionResponse getForStudio(Long id) {
        return ExhibitionResponse.from(require(id));
    }

    public ExhibitionResponse create(ExhibitionRequest request, String actorEmail) {
        Exhibition exhibition = new Exhibition();
        apply(exhibition, request);
        exhibition.setCreatedBy(users.requireByEmail(actorEmail));
        return ExhibitionResponse.from(exhibitions.save(exhibition));
    }

    public ExhibitionResponse update(Long id, ExhibitionRequest request) {
        Exhibition exhibition = require(id);
        apply(exhibition, request);
        return ExhibitionResponse.from(exhibitions.saveAndFlush(exhibition));
    }

    /** Deleting an exhibition detaches its artworks (the database sets their exhibition to null). */
    public void delete(Long id) {
        exhibitions.delete(require(id));
        exhibitions.flush();
    }

    @Transactional(readOnly = true)
    public Exhibition require(Long id) {
        return exhibitions.findById(id).orElseThrow(() -> new NotFoundException("Exhibition", id));
    }

    private void apply(Exhibition exhibition, ExhibitionRequest request) {
        exhibition.setTitle(request.title().trim());
        exhibition.setDescription(request.description());
        exhibition.setBudget(request.budget());
        exhibition.setDurationDays(request.durationDays());
        exhibition.setStartsOn(request.startsOn());
        exhibition.setVenue(request.venue());
        exhibition.setCoverUrl(request.coverUrl());
        exhibition.setArtist(artists.require(request.artistId()));
    }

    private static String normalize(String query) {
        return query == null || query.isBlank() ? null : query.trim();
    }
}
