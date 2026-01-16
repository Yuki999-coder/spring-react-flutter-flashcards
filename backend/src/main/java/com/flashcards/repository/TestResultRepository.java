package com.flashcards.repository;

import com.flashcards.model.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for TestResult entity
 */
@Repository
public interface TestResultRepository extends JpaRepository<TestResult, Long> {

    /**
     * Find all test results for a user and deck, ordered by submission date
     */
    List<TestResult> findByUserIdAndDeckIdOrderBySubmittedAtDesc(Long userId, Long deckId);

    /**
     * Find all test results for a user, ordered by submission date
     */
    List<TestResult> findByUserIdOrderBySubmittedAtDesc(Long userId);

    /**
     * Get average score for a user and deck
     */
    @Query("SELECT AVG(t.score) FROM TestResult t WHERE t.userId = :userId AND t.deckId = :deckId")
    Double getAverageScoreByUserIdAndDeckId(@Param("userId") Long userId, @Param("deckId") Long deckId);

    /**
     * Count test results for a user and deck
     */
    Long countByUserIdAndDeckId(Long userId, Long deckId);
}
