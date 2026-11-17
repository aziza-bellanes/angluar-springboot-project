package com.sip.psm.auction;

import com.sip.psm.auction.AuctionDtos.AuctionRequest;
import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.common.PageResponse;
import jakarta.validation.Valid;
import java.util.EnumSet;
import java.util.Set;
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

/** Auction management, ADMIN only. */
@RestController
@RequestMapping("/api/studio/auctions")
public class StudioAuctionController {

    private final AuctionService service;

    public StudioAuctionController(AuctionService service) {
        this.service = service;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public PageResponse<AuctionView> list(@RequestParam(required = false) Set<AuctionStatus> status,
                                          @PageableDefault(size = 20, sort = "startsAt", direction = Sort.Direction.DESC)
                                          Pageable pageable) {
        Set<AuctionStatus> filter = status == null || status.isEmpty() ? EnumSet.allOf(AuctionStatus.class) : status;
        return service.list(filter, null, pageable);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AuctionView create(@Valid @RequestBody AuctionRequest request) {
        return service.create(request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public AuctionView update(@PathVariable Long id, @Valid @RequestBody AuctionRequest request) {
        return service.update(id, request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/cancel")
    public AuctionView cancel(@PathVariable Long id) {
        return service.cancel(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
