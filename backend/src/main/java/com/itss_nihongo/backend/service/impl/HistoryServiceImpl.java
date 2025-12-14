package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.response.HistoryResponse;
import com.itss_nihongo.backend.entity.UserEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.HistoryRepository;
import com.itss_nihongo.backend.service.HistoryService;
import com.itss_nihongo.backend.service.UserService;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class HistoryServiceImpl implements HistoryService {

    private final HistoryRepository historyRepository;
    private final UserService userService;

    public HistoryServiceImpl(HistoryRepository historyRepository, UserService userService) {
        this.historyRepository = historyRepository;
        this.userService = userService;
    }

    @Override
    public List<HistoryResponse> getHistoryByUser(String username, Integer limit) {
        UserEntity user = userService.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<com.itss_nihongo.backend.entity.HistoryEntity> histories;
        if (limit != null && limit > 0) {
            PageRequest pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
            histories = historyRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageRequest);
        } else {
            histories = historyRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        }

        return histories.stream()
                .map(HistoryResponse::fromEntity)
                .collect(Collectors.toList());
    }
}

