package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.DashboardSummaryResponse;

public interface DashboardService {

    DashboardSummaryResponse getSummary(Integer lectureLimit, String username);
}


