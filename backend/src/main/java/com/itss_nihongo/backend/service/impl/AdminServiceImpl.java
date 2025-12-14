package com.itss_nihongo.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.itss_nihongo.backend.dto.mapper.UserMapper;
import com.itss_nihongo.backend.service.LectureService;
import com.itss_nihongo.backend.dto.response.LectureSummaryResponse;
import com.itss_nihongo.backend.dto.response.UserResponse;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.LectureStatus;
import com.itss_nihongo.backend.entity.UserEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideDeckRepository;
import com.itss_nihongo.backend.repository.TranscriptionRecordRepository;
import com.itss_nihongo.backend.repository.UserRepository;
import com.itss_nihongo.backend.service.AdminService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final LectureRepository lectureRepository;
    private final SlideDeckRepository slideDeckRepository;
    private final TranscriptionRecordRepository transcriptionRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final LectureService lectureService;
    private final ObjectMapper objectMapper;

    public AdminServiceImpl(
            UserRepository userRepository,
            LectureRepository lectureRepository,
            SlideDeckRepository slideDeckRepository,
            TranscriptionRecordRepository transcriptionRecordRepository,
            PasswordEncoder passwordEncoder,
            LectureService lectureService) {
        this.userRepository = userRepository;
        this.lectureRepository = lectureRepository;
        this.slideDeckRepository = slideDeckRepository;
        this.transcriptionRecordRepository = transcriptionRecordRepository;
        this.passwordEncoder = passwordEncoder;
        this.lectureService = lectureService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> listAllUsers() {
        return userRepository.findAll().stream()
                .map(UserMapper::toUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        userRepository.delete(user);
    }

    @Override
    public void changeUserPassword(Long userId, String newPassword) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LectureSummaryResponse> listAllLectures(String status) {
        List<LectureEntity> lectures;
        if (status != null && !status.isEmpty()) {
            try {
                LectureStatus lectureStatus = LectureStatus.valueOf(status);
                lectures = lectureRepository.findAll().stream()
                        .filter(l -> l.getStatus() == lectureStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                lectures = lectureRepository.findAll();
            }
        } else {
            lectures = lectureRepository.findAll();
        }
        return lectures.stream()
                .map(this::toLectureSummaryResponse)
                .collect(Collectors.toList());
    }

    private LectureSummaryResponse toLectureSummaryResponse(LectureEntity lecture) {
        com.itss_nihongo.backend.dto.response.SlideDeckSummaryResponse slideDeckSummary = null;
        if (lecture.getSlideDeck() != null) {
            var slideDeck = lecture.getSlideDeck();
            slideDeckSummary = com.itss_nihongo.backend.dto.response.SlideDeckSummaryResponse.builder()
                    .id(slideDeck.getId())
                    .gcpAssetId(slideDeck.getGcpAssetId())
                    .originalName(slideDeck.getOriginalName())
                    .processedFileName(slideDeck.getProcessedFileName())
                    .presentationId(slideDeck.getPresentationId())
                    .pageCount(slideDeck.getPageCount())
                    .keywordsCount(slideDeck.getKeywordsCount())
                    .hasEmbeddings(slideDeck.getHasEmbeddings())
                    .contentSummary(slideDeck.getContentSummary())
                    .uploadStatus(slideDeck.getUploadStatus())
                    .build();
        }
        return LectureSummaryResponse.builder()
                .id(lecture.getId())
                .title(lecture.getTitle())
                .description(lecture.getDescription())
                .status(lecture.getStatus())
                .createdAt(lecture.getCreatedAt())
                .updatedAt(lecture.getUpdatedAt())
                .slideDeck(slideDeckSummary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportUsers(String format) {
        List<UserResponse> users = listAllUsers();
        return switch (format.toLowerCase()) {
            case "csv" -> exportUsersToCsv(users);
            case "xlsx", "excel" -> exportUsersToExcel(users);
            case "json" -> exportUsersToJson(users);
            default -> throw new AppException(ErrorCode.INVALID_REQUEST, "Unsupported format: " + format);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportLectures(String format, String status) {
        List<LectureEntity> lectures;
        if (status != null && !status.isEmpty()) {
            try {
                LectureStatus lectureStatus = LectureStatus.valueOf(status);
                lectures = lectureRepository.findAll().stream()
                        .filter(l -> l.getStatus() == lectureStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                lectures = lectureRepository.findAll();
            }
        } else {
            lectures = lectureRepository.findAll();
        }
        return switch (format.toLowerCase()) {
            case "csv" -> exportLecturesToCsv(lectures);
            case "xlsx", "excel" -> exportLecturesToExcel(lectures);
            case "json" -> exportLecturesToJson(lectures);
            default -> throw new AppException(ErrorCode.INVALID_REQUEST, "Unsupported format: " + format);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportStatistics(String format) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalLectures", lectureRepository.count());
        stats.put("totalSlideDecks", slideDeckRepository.count());
        stats.put("totalTranscriptionRecords", transcriptionRecordRepository.count());

        // Count by status
        Map<String, Long> lecturesByStatus = lectureRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        l -> l.getStatus().name(),
                        Collectors.counting()));
        stats.put("lecturesByStatus", lecturesByStatus);

        return switch (format.toLowerCase()) {
            case "json" -> exportStatisticsToJson(stats);
            case "csv" -> exportStatisticsToCsv(stats);
            default -> throw new AppException(ErrorCode.INVALID_REQUEST, "Unsupported format: " + format);
        };
    }

    private byte[] exportUsersToCsv(List<UserResponse> users) {
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Username,Roles,Created At,Updated At\n");
        for (UserResponse user : users) {
            csv.append(user.getId()).append(",")
                    .append(escapeCsv(user.getUsername())).append(",")
                    .append(escapeCsv(String.join(";", user.getRoles()))).append(",")
                    .append(user.getCreatedAt()).append(",")
                    .append(user.getUpdatedAt()).append("\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] exportUsersToExcel(List<UserResponse> users) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Users");
            
            // Header
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "Username", "Roles", "Created At", "Updated At"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            // Data
            int rowNum = 1;
            for (UserResponse user : users) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(user.getId());
                row.createCell(1).setCellValue(user.getUsername());
                row.createCell(2).setCellValue(String.join(";", user.getRoles()));
                row.createCell(3).setCellValue(user.getCreatedAt().toString());
                row.createCell(4).setCellValue(user.getUpdatedAt().toString());
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to export users to Excel", e);
        }
    }

    private byte[] exportUsersToJson(List<UserResponse> users) {
        try {
            return objectMapper.writeValueAsBytes(users);
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to export users to JSON", e);
        }
    }

    private byte[] exportLecturesToCsv(List<LectureEntity> lectures) {
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Title,Description,Status,User ID,Username,Slide Pages,Created At,Updated At\n");
        for (LectureEntity lecture : lectures) {
            csv.append(lecture.getId()).append(",")
                    .append(escapeCsv(lecture.getTitle())).append(",")
                    .append(escapeCsv(lecture.getDescription() != null ? lecture.getDescription() : "")).append(",")
                    .append(lecture.getStatus().name()).append(",")
                    .append(lecture.getUser() != null ? lecture.getUser().getId() : "").append(",")
                    .append(escapeCsv(lecture.getUser() != null ? lecture.getUser().getUsername() : "")).append(",")
                    .append(lecture.getSlideDeck() != null ? lecture.getSlideDeck().getPageCount() : 0).append(",")
                    .append(lecture.getCreatedAt()).append(",")
                    .append(lecture.getUpdatedAt()).append("\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] exportLecturesToExcel(List<LectureEntity> lectures) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Lectures");
            
            // Header
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "Title", "Description", "Status", "User ID", "Username", "Slide Pages", "Created At", "Updated At"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            // Data
            int rowNum = 1;
            for (LectureEntity lecture : lectures) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(lecture.getId());
                row.createCell(1).setCellValue(lecture.getTitle());
                row.createCell(2).setCellValue(lecture.getDescription() != null ? lecture.getDescription() : "");
                row.createCell(3).setCellValue(lecture.getStatus().name());
                row.createCell(4).setCellValue(lecture.getUser() != null ? lecture.getUser().getId() : 0);
                row.createCell(5).setCellValue(lecture.getUser() != null ? lecture.getUser().getUsername() : "");
                row.createCell(6).setCellValue(lecture.getSlideDeck() != null ? lecture.getSlideDeck().getPageCount() : 0);
                row.createCell(7).setCellValue(lecture.getCreatedAt().toString());
                row.createCell(8).setCellValue(lecture.getUpdatedAt().toString());
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to export lectures to Excel", e);
        }
    }

    private byte[] exportLecturesToJson(List<LectureEntity> lectures) {
        try {
            List<LectureSummaryResponse> summaries = lectures.stream()
                    .map(this::toLectureSummaryResponse)
                    .collect(Collectors.toList());
            return objectMapper.writeValueAsBytes(summaries);
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to export lectures to JSON", e);
        }
    }

    private byte[] exportStatisticsToJson(Map<String, Object> stats) {
        try {
            return objectMapper.writeValueAsBytes(stats);
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to export statistics to JSON", e);
        }
    }

    private byte[] exportStatisticsToCsv(Map<String, Object> stats) {
        StringBuilder csv = new StringBuilder();
        csv.append("Metric,Value\n");
        stats.forEach((key, value) -> {
            if (!(value instanceof Map)) {
                csv.append(key).append(",").append(value).append("\n");
            }
        });
        // Add lectures by status
        @SuppressWarnings("unchecked")
        Map<String, Long> lecturesByStatus = (Map<String, Long>) stats.get("lecturesByStatus");
        if (lecturesByStatus != null) {
            csv.append("\nLectures by Status\n");
            csv.append("Status,Count\n");
            lecturesByStatus.forEach((status, count) -> {
                csv.append(status).append(",").append(count).append("\n");
            });
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}

