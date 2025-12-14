package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.request.ChangePasswordRequest;
import com.itss_nihongo.backend.dto.response.LectureSummaryResponse;
import com.itss_nihongo.backend.dto.response.UserResponse;
import com.itss_nihongo.backend.service.AdminService;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(adminService.listAllUsers());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<Void> changeUserPassword(
            @PathVariable Long id,
            @RequestBody ChangePasswordRequest request) {
        adminService.changeUserPassword(id, request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/lectures")
    public ResponseEntity<List<LectureSummaryResponse>> listAllLectures(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.listAllLectures(status));
    }

    @GetMapping("/export/users")
    public ResponseEntity<byte[]> exportUsers(
            @RequestParam(defaultValue = "csv") String format) {
        byte[] data = adminService.exportUsers(format);
        String contentType = getContentType(format);
        String filename = "users." + format.toLowerCase();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    @GetMapping("/export/lectures")
    public ResponseEntity<byte[]> exportLectures(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String status) {
        byte[] data = adminService.exportLectures(format, status);
        String contentType = getContentType(format);
        String filename = "lectures." + format.toLowerCase();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    @GetMapping("/export/statistics")
    public ResponseEntity<byte[]> exportStatistics(
            @RequestParam(defaultValue = "json") String format) {
        byte[] data = adminService.exportStatistics(format);
        String contentType = getContentType(format);
        String filename = "statistics." + format.toLowerCase();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    private String getContentType(String format) {
        return switch (format.toLowerCase()) {
            case "csv" -> "text/csv";
            case "xlsx", "excel" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "json" -> "application/json";
            default -> "application/octet-stream";
        };
    }
}

