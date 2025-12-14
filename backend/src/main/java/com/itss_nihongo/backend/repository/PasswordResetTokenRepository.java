package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.PasswordResetTokenEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

    Optional<PasswordResetTokenEntity> findByToken(String token);

    @Modifying
    @Query("DELETE FROM PasswordResetTokenEntity t WHERE t.expiresAt < CURRENT_TIMESTAMP OR t.used = true")
    void deleteExpiredTokens();

    @Modifying
    @Query("UPDATE PasswordResetTokenEntity t SET t.used = true WHERE t.user.id = :userId")
    void invalidateUserTokens(@Param("userId") Long userId);
}

