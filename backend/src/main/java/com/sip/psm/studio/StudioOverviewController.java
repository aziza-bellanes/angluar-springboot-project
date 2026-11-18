package com.sip.psm.studio;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** KPI cards of the studio dashboard (ADMIN and COLLABORATEUR). */
@RestController
@RequestMapping("/api/studio/overview")
public class StudioOverviewController {

    private final StudioOverviewService service;

    public StudioOverviewController(StudioOverviewService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','COLLABORATEUR')")
    @GetMapping
    public StudioOverview overview() {
        return service.overview();
    }
}
