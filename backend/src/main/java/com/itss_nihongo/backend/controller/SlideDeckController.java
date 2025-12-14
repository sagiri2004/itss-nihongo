package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.response.SlideDeckResponse;
import com.itss_nihongo.backend.service.SlideDeckService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/slides")
public class SlideDeckController {

    private final SlideDeckService slideDeckService;

    public SlideDeckController(SlideDeckService slideDeckService) {
        this.slideDeckService = slideDeckService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public SlideDeckResponse uploadSlideDeck(@RequestParam("lectureId") Long lectureId,
                                             @RequestPart("file") MultipartFile file) {
        return slideDeckService.uploadSlideDeck(lectureId, file);
    }

    @PostMapping("/reprocess")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public SlideDeckResponse reprocessSlideDeck(@RequestParam("lectureId") Long lectureId) {
        return slideDeckService.reprocessSlideDeck(lectureId);
    }

    @PostMapping("/reprocess/all")
    @PreAuthorize("hasRole('ADMIN')")
    public void reprocessAllSlideDecks() {
        slideDeckService.reprocessAllSlideDecks();
    }
}


