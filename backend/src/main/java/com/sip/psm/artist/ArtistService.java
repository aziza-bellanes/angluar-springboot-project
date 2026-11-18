package com.sip.psm.artist;

import com.sip.psm.artist.ArtistDtos.ArtistRequest;
import com.sip.psm.artist.ArtistDtos.ArtistResponse;
import com.sip.psm.artist.ArtistDtos.ArtistSummary;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.common.PageResponse;
import com.sip.psm.user.UserService;
import java.util.Locale;
import java.util.Objects;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Artist catalogue (specification "Client" CRUD). */
@Service
@Transactional
public class ArtistService {

    private final ArtistRepository artists;
    private final UserService users;
    private final ApplicationEventPublisher events;

    public ArtistService(ArtistRepository artists, UserService users, ApplicationEventPublisher events) {
        this.artists = artists;
        this.users = users;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArtistSummary> listPublic(String query, Pageable pageable) {
        return PageResponse.of(artists.search(normalize(query), true, pageable), ArtistSummary::from);
    }

    @Transactional(readOnly = true)
    public ArtistSummary getPublic(Long id) {
        Artist artist = require(id);
        if (!artist.isActive()) {
            throw new NotFoundException("Artist", id);
        }
        return ArtistSummary.from(artist);
    }

    @Transactional(readOnly = true)
    public PageResponse<ArtistResponse> listForStudio(String query, Pageable pageable) {
        return PageResponse.of(artists.search(normalize(query), false, pageable), ArtistResponse::from);
    }

    @Transactional(readOnly = true)
    public ArtistResponse getForStudio(Long id) {
        return ArtistResponse.from(require(id));
    }

    public ArtistResponse create(ArtistRequest request, String actorEmail) {
        Artist artist = new Artist();
        apply(artist, request);
        artist.setCreatedBy(users.requireByEmail(actorEmail));
        artist = artists.save(artist);
        publishContactCreated(artist);
        return ArtistResponse.from(artist);
    }

    public ArtistResponse update(Long id, ArtistRequest request) {
        Artist artist = require(id);
        String previousEmail = normalizedEmail(artist.getEmail());
        apply(artist, request);
        artist = artists.saveAndFlush(artist);
        if (!Objects.equals(previousEmail, normalizedEmail(artist.getEmail()))) {
            publishContactCreated(artist);
        }
        return ArtistResponse.from(artist);
    }

    /** Deleting an artist referenced by exhibitions or artworks is refused by the database (HTTP 409). */
    public void delete(Long id) {
        artists.delete(require(id));
        artists.flush();
    }

    @Transactional(readOnly = true)
    public Artist require(Long id) {
        return artists.findById(id).orElseThrow(() -> new NotFoundException("Artist", id));
    }

    private static void apply(Artist artist, ArtistRequest request) {
        artist.setName(request.name().trim());
        artist.setEmail(request.email().trim());
        artist.setPhone(request.phone());
        artist.setAddress(request.address());
        artist.setCountry(request.country());
        artist.setBiography(request.biography());
        artist.setPhotoUrl(request.photoUrl());
        artist.setActive(request.active() == null || request.active());
    }

    static String normalize(String query) {
        return query == null || query.isBlank() ? null : query.trim();
    }

    private void publishContactCreated(Artist artist) {
        if (artist.getEmail() != null && !artist.getEmail().isBlank()) {
            events.publishEvent(new ArtistContactCreatedEvent(artist.getId(), artist.getName(), artist.getEmail()));
        }
    }

    private static String normalizedEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
