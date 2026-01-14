package com.flashcards.repository;

import com.flashcards.model.entity.CardProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Card Progress Repository
 * Data access layer for CardProgress entity
 * Handles Spaced Repetition System (SRS) queries
 */
@Repository
public interface CardProgressRepository extends JpaRepository<CardProgress, Long> {

    /**
     * Find due cards for a specific user
     * Due cards are cards that need to be reviewed now (nextReview <= current time or NULL)
     * 
     * Security: Only returns cards owned by the specified user
     * Filtering: Excludes soft-deleted cards and decks
     * Ordering: Prioritizes new cards (nextReview NULL) first, then oldest due cards
     * 
     * Logic:
     * - Join: CardProgress -> Card -> Deck
     * - Condition 1: cp.userId = :userId (Security)
     * - Condition 2: Card and Deck are not soft-deleted
     * - Condition 3: nextReview <= NOW or nextReview IS NULL
     * - Sort: NULL first (new cards), then by nextReview ASC (oldest first)
     *
     * @param userId User ID requesting due cards
     * @return List of CardProgress ready for review, ordered by priority
     */
    @Query("SELECT cp FROM CardProgress cp " +
           "INNER JOIN Card c ON cp.cardId = c.id " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE cp.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND (cp.nextReview <= CURRENT_TIMESTAMP OR cp.nextReview IS NULL) " +
           "ORDER BY " +
           "CASE WHEN cp.nextReview IS NULL THEN 0 ELSE 1 END, " +
           "cp.nextReview ASC")
    List<CardProgress> findDueCards(@Param("userId") Long userId);

    /**
     * Find due cards for a specific deck
     * Similar to findDueCards but limited to one deck
     *
     * @param userId User ID
     * @param deckId Deck ID
     * @return List of due CardProgress in the specified deck
     */
    @Query("SELECT cp FROM CardProgress cp " +
           "INNER JOIN Card c ON cp.cardId = c.id " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE cp.userId = :userId " +
           "AND c.deckId = :deckId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND (cp.nextReview <= CURRENT_TIMESTAMP OR cp.nextReview IS NULL) " +
           "ORDER BY " +
           "CASE WHEN cp.nextReview IS NULL THEN 0 ELSE 1 END, " +
           "cp.nextReview ASC")
    List<CardProgress> findDueCardsByDeck(
        @Param("userId") Long userId,
        @Param("deckId") Long deckId
    );

    /**
     * Find progress for a specific user-card combination
     * Each user-card pair should have only one progress record
     *
     * @param userId User ID
     * @param cardId Card ID
     * @return Optional containing CardProgress if exists
     */
    Optional<CardProgress> findByUserIdAndCardId(Long userId, Long cardId);

    /**
     * Find all progress records for a user
     *
     * @param userId User ID
     * @return List of all CardProgress for the user
     */
    List<CardProgress> findAllByUserId(Long userId);

    /**
     * Count new cards (never studied) for a user
     *
     * @param userId User ID
     * @return Count of new cards
     */
    @Query("SELECT COUNT(cp) FROM CardProgress cp " +
           "INNER JOIN Card c ON cp.cardId = c.id " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE cp.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND cp.learningState = 'NEW'")
    long countNewCards(@Param("userId") Long userId);

    /**
     * Count cards in review state for a user
     *
     * @param userId User ID
     * @return Count of reviewing cards
     */
    @Query("SELECT COUNT(cp) FROM CardProgress cp " +
           "INNER JOIN Card c ON cp.cardId = c.id " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE cp.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND cp.learningState = 'REVIEWING'")
    long countReviewingCards(@Param("userId") Long userId);

    /**
     * Count due cards (cards that need to be reviewed now)
     *
     * @param userId User ID
     * @return Count of due cards
     */
    @Query("SELECT COUNT(cp) FROM CardProgress cp " +
           "INNER JOIN Card c ON cp.cardId = c.id " +
           "INNER JOIN Deck d ON c.deckId = d.id " +
           "WHERE cp.userId = :userId " +
           "AND c.isDeleted = false " +
           "AND d.isDeleted = false " +
           "AND (cp.nextReview <= CURRENT_TIMESTAMP OR cp.nextReview IS NULL)")
    long countDueCards(@Param("userId") Long userId);
}
