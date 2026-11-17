package com.sip.psm.artist;

import com.sip.psm.artist.ArtistDtos.ArtistRequest;
import com.sip.psm.artist.ArtistDtos.ArtistResponse;
import com.sip.psm.common.PageResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Studio management of artists. GET/POST: ADMIN and COLLABORATEUR; PUT/DELETE: ADMIN
 * (enforced in {@link com.sip.psm.config.SecurityConfig}).
 */
@RestController
@RequestMapping("/api/studio/artists")
public class StudioArtistController {

    private final ArtistService service;

    public StudioArtistController(ArtistService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @GetMapping
    public PageResponse<ArtistResponse> list(@RequestParam(required = false) String q,
                                             @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC)
                                             Pageable pageable) {
        return service.listForStudio(q, pageable);
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @GetMapping("/{id}")
    public ArtistResponse get(@PathVariable Long id) {
        return service.getForStudio(id);
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ArtistResponse create(@Valid @RequestBody ArtistRequest request, Principal principal) {
        return service.create(request, principal.getName());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ArtistResponse update(@PathVariable Long id, @Valid @RequestBody ArtistRequest request) {
        return service.update(id, request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
