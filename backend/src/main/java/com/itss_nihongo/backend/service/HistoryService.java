package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.HistoryResponse;
import java.util.List;

public interface HistoryService {

    List<HistoryResponse> getHistoryByUser(String username, Integer limit);
}

