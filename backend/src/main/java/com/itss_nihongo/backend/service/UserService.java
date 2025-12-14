package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.UserResponse;
import com.itss_nihongo.backend.entity.Role;
import com.itss_nihongo.backend.entity.UserEntity;
import java.util.Optional;
import java.util.Set;

public interface UserService {

    UserEntity registerUser(String username, String rawPassword, String email, Set<Role> roles);

    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmail(String email);

    UserResponse mapToResponse(UserEntity userEntity);
}

