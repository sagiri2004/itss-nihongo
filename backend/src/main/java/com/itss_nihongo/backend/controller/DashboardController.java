package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.response.DashboardSummaryResponse;
import com.itss_nihongo.backend.service.DashboardService;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public DashboardSummaryResponse getSummary(@RequestParam(name = "limit", required = false) Integer limit,
                                               Principal principal) {
        return dashboardService.getSummary(limit, principal != null ? principal.getName() : null);
    }
}


