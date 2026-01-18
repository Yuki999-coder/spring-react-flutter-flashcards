package com.flashcards.repository;

import com.flashcards.model.entity.StudyLog;
import com.flashcards.model.enums.Grade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Study Log Repository
 * Data access layer for StudyLog entity
 * Tracks all study sessions for analytics and statistics
 */
@Repository
public interface StudyLogRepository extends JpaRepository<StudyLog, UUID> {

    /**
     * Find all study logs for a specific user
     * Security: Only returns logs belonging to the specified user
     *
     * @param userId User ID
     * @param pageable Pagination parameters
     * @return Page of study logs ordered by most recent first
     */
    Page<StudyLog> findAllByUserIdOrderByReviewedAtDesc(UUID userId, Pageable pageable);

    /**
     * Find study logs for a specific card
     * Security: Ensures logs belong to the specified user
     *
     * @param userId User ID
     * @param cardId Card ID
     * @return List of study logs for the card
     */
    List<StudyLog> findAllByUserIdAndCardIdOrderByReviewedAtDesc(UUID userId, UUID cardId);

    /**
     * Find study logs within a date range
     * Useful for analytics and progress tracking
     *
     * @param userId User ID
     * @param startDate Start date (inclusive)
     * @param endDate End date (inclusive)
     * @return List of study logs in the date range
     */
    @Query("SELECT sl FROM StudyLog sl " +
           "WHERE sl.userId = :userId " +
           "AND sl.reviewedAt >= :startDate " +
           "AND sl.reviewedAt <= :endDate " +
           "ORDER BY sl.reviewedAt DESC")
    List<StudyLog> findByUserIdAndDateRange(
        @Param("userId") UUID userId,
        @Param("startDate") Instant startDate,
        @Param("endDate") Instant endDate
    );

    /**
     * Count total reviews for a user
     *
     * @param userId User ID
     * @return Total number of reviews
     */
    long countByUserId(UUID userId);

    /**
     * Count reviews by grade for a user
     * Useful for calculating retention/accuracy statistics
     *
     * @param userId User ID
     * @param grade Grade to count
     * @return Number of reviews with the specified grade
     */
    long countByUserIdAndGrade(UUID userId, Grade grade);

    /**
     * Get study statistics for today
     * Returns logs from start of current day to now
     *
     * @param userId User ID
     * @param startOfDay Start of current day (00:00:00)
     * @return List of today's study logs
     */
    @Query("SELECT sl FROM StudyLog sl " +
           "WHERE sl.userId = :userId " +
           "AND sl.reviewedAt >= :startOfDay " +
           "ORDER BY sl.reviewedAt DESC")
    List<StudyLog> findTodayLogs(
        @Param("userId") UUID userId,
        @Param("startOfDay") Instant startOfDay
    );

    /**
     * Calculate average study time for a user
     *
     * @param userId User ID
     * @return Average time taken in milliseconds
     */
    @Query("SELECT AVG(sl.timeTakenMs) FROM StudyLog sl " +
           "WHERE sl.userId = :userId " +
           "AND sl.timeTakenMs IS NOT NULL")
    Double getAverageStudyTime(@Param("userId") UUID userId);

    /**
     * Get study streak data (days with at least one review)
     *
     * @param userId User ID
     * @param startDate Start date to check streak
     * @return Count of distinct days with reviews
     */
    @Query("SELECT COUNT(DISTINCT DATE(sl.reviewedAt)) FROM StudyLog sl " +
           "WHERE sl.userId = :userId " +
           "AND sl.reviewedAt >= :startDate")
    long countStudyDays(
        @Param("userId") UUID userId,
        @Param("startDate") Instant startDate
    );
    
    /**
     * Count total unique cards studied by user
     * For statistics summary
     */
    @Query("SELECT COUNT(DISTINCT sl.cardId) FROM StudyLog sl WHERE sl.userId = :userId")
    Long countDistinctCardsByUserId(@Param("userId") UUID userId);
    
    /**
     * Get study logs for heatmap (last N days)
     * For statistics heatmap visualization
     */
    @Query("SELECT sl FROM StudyLog sl WHERE sl.userId = :userId AND sl.reviewedAt >= :startDate")
    List<StudyLog> findByUserIdAndReviewedAtAfter(@Param("userId") UUID userId, @Param("startDate") Instant startDate);
    
    /**
     * Get all study logs for user (for streak calculation)
     * Ordered by most recent first
     */
    @Query("SELECT sl FROM StudyLog sl WHERE sl.userId = :userId ORDER BY sl.reviewedAt DESC")
    List<StudyLog> findAllByUserIdOrderByReviewedAtDesc(@Param("userId") UUID userId);
}
