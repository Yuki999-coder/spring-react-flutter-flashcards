package com.flashcards.repository;

import com.flashcards.model.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Folder Repository
 * Data access layer for Folder entity
 */
@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    
    /**
     * Find all folders by user ID (excluding soft-deleted)
     */
    @Query("SELECT f FROM Folder f WHERE f.userId = :userId AND f.isDeleted = false ORDER BY f.createdAt DESC")
    List<Folder> findByUserId(@Param("userId") Long userId);
    
    /**
     * Find folder by ID and user ID (security check)
     */
    @Query("SELECT f FROM Folder f WHERE f.id = :folderId AND f.userId = :userId AND f.isDeleted = false")
    Optional<Folder> findByIdAndUserId(@Param("folderId") Long folderId, @Param("userId") Long userId);
    
    /**
     * Count folders by user ID
     */
    @Query("SELECT COUNT(f) FROM Folder f WHERE f.userId = :userId AND f.isDeleted = false")
    Long countByUserId(@Param("userId") Long userId);
}
