package com.flashcards.repository;

import com.flashcards.model.entity.Deck;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Deck Repository
 * Data access layer for Deck entity
 * Note: Soft delete is handled automatically by @Where clause in Entity
 */
@Repository
public interface DeckRepository extends JpaRepository<Deck, Long> {

    /**
     * Find all decks owned by a specific user
     * Security: Only returns decks belonging to the specified user
     * Auto-filters soft-deleted decks via @Where clause
     *
     * @param userId User ID who owns the decks
     * @return List of decks, empty if none found
     */
    List<Deck> findAllByUserId(Long userId);

    /**
     * Find a specific deck by ID and verify ownership
     * Security: Ensures the deck belongs to the specified user
     *
     * @param id Deck ID
     * @param userId User ID who should own the deck
     * @return Optional containing Deck if found and owned by user
     */
    Optional<Deck> findByIdAndUserId(Long id, Long userId);

    /**
     * Count total decks for a user
     *
     * @param userId User ID
     * @return Number of decks (excluding soft-deleted)
     */
    long countByUserId(Long userId);
    
    /**
     * Find uncategorized decks (not in any folder)
     * Security: Only returns decks belonging to the specified user
     *
     * @param userId User ID who owns the decks
     * @return List of decks without folder
     */
    List<Deck> findByUserIdAndFolderIdIsNull(Long userId);
    
    /**
     * Find decks in a specific folder
     * Security: Ensures decks belong to the specified user
     *
     * @param folderId Folder ID
     * @param userId User ID who owns the decks
     * @return List of decks in the folder
     */
    List<Deck> findByFolderIdAndUserId(Long folderId, Long userId);
    
    /**
     * Search decks by title or description (case-insensitive)
     * Security: Only returns decks belonging to the specified user
     *
     * @param userId User ID who owns the decks
     * @param searchTerm Search term to match against title or description
     * @param pageable Pagination and limit
     * @return List of matching decks
     */
    @Query("SELECT d FROM Deck d WHERE d.userId = :userId " +
           "AND (LOWER(d.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(d.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<Deck> searchDecks(@Param("userId") Long userId, 
                           @Param("searchTerm") String searchTerm,
                           Pageable pageable);
    
    /**
     * Count total search results for decks
     *
     * @param userId User ID who owns the decks
     * @param searchTerm Search term
     * @return Total count of matching decks
     */
    @Query("SELECT COUNT(d) FROM Deck d WHERE d.userId = :userId " +
           "AND (LOWER(d.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(d.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    long countSearchDecks(@Param("userId") Long userId, 
                          @Param("searchTerm") String searchTerm);
    
    /**
     * Update last viewed timestamp without triggering updatedAt
     * Uses native query to avoid Hibernate's @UpdateTimestamp
     *
     * @param id Deck ID
     * @param userId User ID (for security)
     * @param lastViewedAt Timestamp to set
     * @return Number of rows updated (should be 1 if successful)
     */
    @Modifying
    @Query(value = "UPDATE decks SET last_viewed_at = :lastViewedAt " +
                   "WHERE id = :id AND user_id = :userId AND is_deleted = false", 
           nativeQuery = true)
    int updateLastViewedAt(@Param("id") Long id, 
                           @Param("userId") Long userId, 
                           @Param("lastViewedAt") LocalDateTime lastViewedAt);
}
