package com.sip.psm.artwork;

import com.sip.psm.artwork.ArtworkDtos.ArtworkRequest;
import com.sip.psm.artwork.ArtworkDtos.ArtworkResponse;
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

/** Studio management of artworks (access rules enforced in {@link com.sip.psm.config.SecurityConfig}). */
@RestController
@RequestMapping("/api/studio/artworks")
public class StudioArtworkController {

    private final ArtworkService service;

    public StudioArtworkController(ArtworkService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @GetMapping
    public PageResponse<ArtworkResponse> list(@RequestParam(required = false) String q,
                                              @RequestParam(required = false) Long artistId,
                                              @RequestParam(required = false) ArtworkStatus status,
                                              @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
                                              Pageable pageable) {
        return service.listForStudio(q, artistId, status, pageable);
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @GetMapping("/{id}")
    public ArtworkResponse get(@PathVariable Long id) {
        return service.getForStudio(id);
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ArtworkResponse create(@Valid @RequestBody ArtworkRequest request, Principal principal) {
        return service.create(request, principal.getName());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ArtworkResponse update(@PathVariable Long id, @Valid @RequestBody ArtworkRequest request) {
        return service.update(id, request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
