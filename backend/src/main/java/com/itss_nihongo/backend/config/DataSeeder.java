package com.itss_nihongo.backend.config;

import com.itss_nihongo.backend.entity.Role;
import com.itss_nihongo.backend.repository.UserRepository;
import com.itss_nihongo.backend.service.UserService;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    CommandLineRunner seedAdminUser(UserRepository userRepository, UserService userService) {
        return args -> userRepository.findByUsername("admin").ifPresentOrElse(
                user -> log.info("Admin user already exists"),
                () -> {
                    userService.registerUser("admin", "Admin@123", "admin@itss-nihongo.com", Set.of(Role.ROLE_ADMIN, Role.ROLE_USER));
                    log.info("Default admin user created with username 'admin' and email 'admin@itss-nihongo.com'");
                }
        );
    }
}

