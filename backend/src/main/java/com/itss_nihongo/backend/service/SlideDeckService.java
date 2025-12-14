package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.SlideDeckResponse;
import org.springframework.web.multipart.MultipartFile;

public interface SlideDeckService {

    SlideDeckResponse uploadSlideDeck(Long lectureId, MultipartFile file);

    SlideDeckResponse reprocessSlideDeck(Long lectureId);

    void reprocessAllSlideDecks();
}


