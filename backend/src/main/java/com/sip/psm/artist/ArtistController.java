package com.sip.psm.artist;

import com.sip.psm.artist.ArtistDtos.ArtistSummary;
import com.sip.psm.common.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only artist directory. */
@RestController
@RequestMapping("/api/artists")
public class ArtistController {

    private final ArtistService service;

    public ArtistController(ArtistService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ArtistSummary> list(@RequestParam(required = false) String q,
                                            @PageableDefault(size = 24, sort = "name", direction = Sort.Direction.ASC)
                                            Pageable pageable) {
        return service.listPublic(q, pageable);
    }

    @GetMapping("/{id}")
    public ArtistSummary get(@PathVariable Long id) {
        return service.getPublic(id);
    }
}
