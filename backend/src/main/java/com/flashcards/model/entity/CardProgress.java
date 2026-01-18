package com.flashcards.model.entity;

import com.flashcards.model.enums.LearningState;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Card Progress Entity
 * Tracks the Spaced Repetition System (SRS) progress for each user-card combination
 * Implements the SM-2 algorithm for optimal learning intervals
 * Extends BaseEntity for UUID primary key and audit fields
 */
@Entity
@Table(name = "card_progress", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_card", columnNames = {"user_id", "card_id"})
})
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardProgress extends BaseEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "card_id", nullable = false, columnDefinition = "uuid")
    private UUID cardId;

    @Enumerated(EnumType.STRING)
    @Column(name = "learning_state", nullable = false, length = 30)
    @Builder.Default
    private LearningState learningState = LearningState.NEW;

    @Column(name = "next_review")
    private Instant nextReview;

    @Column(nullable = false)
    @Builder.Default
    private Integer interval = 0;

    @Column(name = "ease_factor", nullable = false)
    @Builder.Default
    private Float easeFactor = 2.5f;

    @Column(nullable = false)
    @Builder.Default
    private Integer repetitions = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", insertable = false, updatable = false)
    private Card card;
}
