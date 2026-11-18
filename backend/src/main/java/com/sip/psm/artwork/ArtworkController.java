package com.sip.psm.artwork;

import com.sip.psm.artwork.ArtworkDtos.ArtworkCard;
import com.sip.psm.artwork.ArtworkDtos.ArtworkDetail;
import com.sip.psm.common.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only catalogue of published artworks. */
@RestController
@RequestMapping("/api/artworks")
public class ArtworkController {

    private final ArtworkService service;

    public ArtworkController(ArtworkService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ArtworkCard> list(@RequestParam(required = false) String q,
                                          @RequestParam(required = false) Long artistId,
                                          @RequestParam(required = false) Long exhibitionId,
                                          @RequestParam(required = false) String medium,
                                          @PageableDefault(size = 24, sort = "id", direction = Sort.Direction.DESC)
                                          Pageable pageable) {
        return service.listPublic(q, artistId, exhibitionId, medium, pageable);
    }

    @GetMapping("/{slug}")
    public ArtworkDetail get(@PathVariable String slug) {
        return service.getPublicBySlug(slug);
    }
}
