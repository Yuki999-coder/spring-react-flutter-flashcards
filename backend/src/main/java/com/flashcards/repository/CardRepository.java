package com.flashcards.repository;

import com.flashcards.model.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Card Repository
 * Data access layer for Card entity
 * Note: Soft delete is handled automatically by @Where clause in Entity
 */
@Repository
public interface CardRepository extends JpaRepository<Card, Long> {

    /**
     * Find all cards in a deck with ownership verification
     * Security: Joins to Deck table to verify the deck belongs to the user
     * Auto-filters soft-deleted cards via @Where clause
     * Results are ordered by position ascending
     *
     * @param deckId Deck ID containing the cards
     * @param userId User ID who owns the deck
     * @return List of cards ordered by position, empty if none found or user doesn't own deck
     */
    @Query("SELECT c FROM Card c " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE c.deckId = :deckId " +
           "AND d.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "ORDER BY c.position ASC")
    List<Card> findAllByDeckIdAndDeckUserIdOrderByPositionAsc(
        @Param("deckId") Long deckId,
        @Param("userId") Long userId
    );

    /**
     * Find a specific card with ownership verification
     * Security: Ensures the card's deck belongs to the specified user
     *
     * @param id Card ID
     * @param userId User ID who should own the card's deck
     * @return Optional containing Card if found and owned by user
     */
    @Query("SELECT c FROM Card c " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE c.id = :id " +
           "AND d.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false")
    Optional<Card> findByIdAndDeckUserId(
        @Param("id") Long id,
        @Param("userId") Long userId
    );

    /**
     * Count total cards in a deck
     *
     * @param deckId Deck ID
     * @return Number of cards (excluding soft-deleted)
     */
    long countByDeckId(Long deckId);

    /**
     * Find cards by deck ID (no user verification)
     * Use only for internal operations
     *
     * @param deckId Deck ID
     * @return List of cards ordered by position
     */
    List<Card> findAllByDeckIdOrderByPositionAsc(Long deckId);

    /**
     * Find all cards owned by a user (across all decks)
     * Used for statistics and analytics
     *
     * @param userId User ID
     * @return List of all cards in all decks owned by the user
     */
    @Query("SELECT c FROM Card c " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE d.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false")
    List<Card> findAllByDeck_User_Id(@Param("userId") Long userId);

    /**
     * Find difficult cards in a deck for cram mode
     * Criteria: easeFactor < 2.1 OR learningState = 'RELEARNING'
     * Used for "Review Difficult Cards" feature
     *
     * @param deckId Deck ID
     * @param userId User ID who owns the deck
     * @return List of difficult cards ordered by position
     */
    @Query("SELECT c FROM Card c " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "LEFT JOIN CardProgress cp ON c.id = cp.cardId AND cp.userId = :userId " +
           "WHERE c.deckId = :deckId " +
           "AND d.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND (cp.easeFactor < 2.1 OR cp.learningState = 'RELEARNING') " +
           "ORDER BY c.position ASC")
    List<Card> findDifficultCardsByDeckIdAndUserId(
        @Param("deckId") Long deckId,
        @Param("userId") Long userId
    );

    /**
     * Count difficult cards in a deck
     * Same criteria as findDifficultCardsByDeckIdAndUserId
     *
     * @param deckId Deck ID
     * @param userId User ID
     * @return Number of difficult cards
     */
    @Query("SELECT COUNT(c) FROM Card c " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "LEFT JOIN CardProgress cp ON c.id = cp.cardId AND cp.userId = :userId " +
           "WHERE c.deckId = :deckId " +
           "AND d.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND (cp.easeFactor < 2.1 OR cp.learningState = 'RELEARNING')")
    long countDifficultCardsByDeckIdAndUserId(
        @Param("deckId") Long deckId,
        @Param("userId") Long userId
    );
}
