package com.flashcards.repository;

import com.flashcards.model.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Folder Repository
 * Data access layer for Folder entity (UUID primary key)
 * Soft delete handled by @Where clause in entity
 */
@Repository
public interface FolderRepository extends JpaRepository<Folder, UUID> {
    
    /**
     * Find all folders by user ID (excluding soft-deleted)
     * @Where clause automatically filters deleted_at IS NULL
     */
    List<Folder> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    /**
     * Find folder by ID and user ID (security check)
     */
    Optional<Folder> findByIdAndUserId(UUID folderId, UUID userId);
    
    /**
     * Count folders by user ID
     */
    Long countByUserId(UUID userId);
    
    /**
     * Update last viewed timestamp without triggering updatedAt
     * Uses native query to avoid Hibernate's @UpdateTimestamp
     *
     * @param id Folder ID
     * @param userId User ID (for security)
     * @param lastViewedAt Timestamp to set
     * @return Number of rows updated (should be 1 if successful)
     */
    @Modifying
    @Query(value = "UPDATE folders SET last_viewed_at = :lastViewedAt " +
                   "WHERE id = CAST(:id AS uuid) AND user_id = CAST(:userId AS uuid) AND deleted_at IS NULL", 
           nativeQuery = true)
    int updateLastViewedAt(@Param("id") UUID id, 
                           @Param("userId") UUID userId, 
                           @Param("lastViewedAt") Instant lastViewedAt);
}
