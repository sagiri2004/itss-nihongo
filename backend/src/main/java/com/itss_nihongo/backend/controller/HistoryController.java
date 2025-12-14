package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.response.HistoryResponse;
import com.itss_nihongo.backend.service.HistoryService;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<HistoryResponse>> getHistory(
            @RequestParam(name = "limit", required = false) Integer limit,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(historyService.getHistoryByUser(principal.getName(), limit));
    }
}

