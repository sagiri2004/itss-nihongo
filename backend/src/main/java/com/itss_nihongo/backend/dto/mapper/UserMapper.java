package com.itss_nihongo.backend.dto.mapper;

import com.itss_nihongo.backend.dto.response.UserResponse;
import com.itss_nihongo.backend.entity.Role;
import com.itss_nihongo.backend.entity.UserEntity;
import java.util.Set;
import java.util.stream.Collectors;

public final class UserMapper {

    private UserMapper() {
        // utility
    }

    public static UserResponse toUserResponse(UserEntity userEntity) {
        Set<String> roles = userEntity.getRoles()
                .stream()
                .map(Role::name)
                .collect(Collectors.toSet());
        return new UserResponse(
                userEntity.getId(),
                userEntity.getUsername(),
                roles,
                userEntity.getCreatedAt(),
                userEntity.getUpdatedAt()
        );
    }
}

