package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.request.LoginRequest;
import com.itss_nihongo.backend.dto.request.RegisterRequest;
import com.itss_nihongo.backend.dto.response.AuthResponse;
import com.itss_nihongo.backend.entity.Role;
import com.itss_nihongo.backend.entity.UserEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.security.JwtTokenProvider;
import com.itss_nihongo.backend.service.AuthService;
import com.itss_nihongo.backend.service.UserService;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                           JwtTokenProvider jwtTokenProvider,
                           UserService userService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userService = userService;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        UserEntity userEntity = userService.registerUser(
                request.getUsername(),
                request.getPassword(),
                Set.of(Role.ROLE_USER)
        );
        String token = jwtTokenProvider.generateToken(userEntity.getUsername(), userEntity.getRoles());
        return buildAuthResponse(userEntity, token);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            UserDetails principal = (UserDetails) authentication.getPrincipal();
            UserEntity userEntity = userService.findByUsername(principal.getUsername())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            String token = jwtTokenProvider.generateToken(principal.getUsername(), userEntity.getRoles());
            return buildAuthResponse(userEntity, token);
        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    private AuthResponse buildAuthResponse(UserEntity userEntity, String token) {
        Set<String> roleNames = userEntity.getRoles()
                .stream()
                .map(Role::name)
                .collect(Collectors.toSet());
        return AuthResponse.builder()
                .token(token)
                .userId(userEntity.getId())
                .username(userEntity.getUsername())
                .roles(roleNames)
                .build();
    }
}

