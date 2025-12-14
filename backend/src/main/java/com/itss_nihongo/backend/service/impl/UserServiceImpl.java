package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.mapper.UserMapper;
import com.itss_nihongo.backend.dto.response.UserResponse;
import com.itss_nihongo.backend.entity.Role;
import com.itss_nihongo.backend.entity.UserEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.UserRepository;
import com.itss_nihongo.backend.service.UserService;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public UserEntity registerUser(String username, String rawPassword, String email, Set<Role> roles) {
        if (userRepository.existsByUsername(username)) {
            throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }
        if (userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        UserEntity userEntity = new UserEntity();
        userEntity.setUsername(username);
        userEntity.setPassword(passwordEncoder.encode(rawPassword));
        userEntity.setEmail(email);
        userEntity.setRoles(new HashSet<>(roles));
        return userRepository.save(userEntity);
    }

    @Override
    public Optional<UserEntity> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public Optional<UserEntity> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public UserResponse mapToResponse(UserEntity userEntity) {
        return UserMapper.toUserResponse(userEntity);
    }
}

