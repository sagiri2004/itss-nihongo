package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.UserResponse;
import com.itss_nihongo.backend.entity.Role;
import com.itss_nihongo.backend.entity.UserEntity;
import java.util.Optional;
import java.util.Set;

public interface UserService {

    UserEntity registerUser(String username, String rawPassword, Set<Role> roles);

    Optional<UserEntity> findByUsername(String username);

    UserResponse mapToResponse(UserEntity userEntity);
}

