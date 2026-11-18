package com.sip.psm.exhibition;

import com.sip.psm.common.PageResponse;
import com.sip.psm.exhibition.ExhibitionDtos.ExhibitionSummary;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only exhibition listing. */
@RestController
@RequestMapping("/api/exhibitions")
public class ExhibitionController {

    private final ExhibitionService service;

    public ExhibitionController(ExhibitionService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ExhibitionSummary> list(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) Long artistId,
                                                @PageableDefault(size = 24, sort = "startsOn",
                                                        direction = Sort.Direction.DESC) Pageable pageable) {
        return service.listPublic(q, artistId, pageable);
    }

    @GetMapping("/{id}")
    public ExhibitionSummary get(@PathVariable Long id) {
        return service.getPublic(id);
    }
}
