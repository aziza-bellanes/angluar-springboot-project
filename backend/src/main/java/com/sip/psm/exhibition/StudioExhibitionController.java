package com.sip.psm.exhibition;

import com.sip.psm.common.PageResponse;
import com.sip.psm.exhibition.ExhibitionDtos.ExhibitionRequest;
import com.sip.psm.exhibition.ExhibitionDtos.ExhibitionResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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

/** Studio management of exhibitions (access rules enforced in {@link com.sip.psm.config.SecurityConfig}). */
@RestController
@RequestMapping("/api/studio/exhibitions")
public class StudioExhibitionController {

    private final ExhibitionService service;

    public StudioExhibitionController(ExhibitionService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ExhibitionResponse> list(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) Long artistId,
                                                 @PageableDefault(size = 20, sort = "startsOn",
                                                         direction = Sort.Direction.DESC) Pageable pageable) {
        return service.listForStudio(q, artistId, pageable);
    }

    @GetMapping("/{id}")
    public ExhibitionResponse get(@PathVariable Long id) {
        return service.getForStudio(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExhibitionResponse create(@Valid @RequestBody ExhibitionRequest request, Principal principal) {
        return service.create(request, principal.getName());
    }

    @PutMapping("/{id}")
    public ExhibitionResponse update(@PathVariable Long id, @Valid @RequestBody ExhibitionRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
