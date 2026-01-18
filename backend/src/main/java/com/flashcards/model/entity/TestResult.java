package com.flashcards.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entity representing a practice test result
 * Extends BaseEntity for UUID primary key and audit fields
 */
@Entity
@Table(name = "test_results")
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestResult extends BaseEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "deck_id", nullable = false, columnDefinition = "uuid")
    private UUID deckId;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score; // Percentage score (0-100)

    @Column(name = "correct_count", nullable = false)
    private Integer correctCount;

    @Column(name = "wrong_count", nullable = false)
    private Integer wrongCount;

    @Column(name = "skipped_count", nullable = false)
    private Integer skippedCount;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @PrePersist
    protected void setSubmittedAt() {
        if (submittedAt == null) {
            submittedAt = Instant.now();
        }
    }
}
