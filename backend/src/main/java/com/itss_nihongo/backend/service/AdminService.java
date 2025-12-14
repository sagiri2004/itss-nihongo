package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.LectureSummaryResponse;
import com.itss_nihongo.backend.dto.response.UserResponse;
import java.util.List;

public interface AdminService {

    List<UserResponse> listAllUsers();

    void deleteUser(Long userId);

    void changeUserPassword(Long userId, String newPassword);

    List<LectureSummaryResponse> listAllLectures(String status);

    byte[] exportUsers(String format);

    byte[] exportLectures(String format, String status);

    byte[] exportStatistics(String format);
}

