package com.flashcards.model.entity;

import com.flashcards.model.enums.Grade;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Study Log Entity
 * Records every review session for analytics and progress tracking
 * Extends BaseEntity for UUID primary key and audit fields
 */
@Entity
@Table(name = "study_log")
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyLog extends BaseEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "card_id", nullable = false, columnDefinition = "uuid")
    private UUID cardId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Grade grade;

    @Column(length = 20)
    private String action; // "LEARN", "REVIEW" - for statistics

    @Column(name = "time_taken_ms")
    private Integer timeTakenMs;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", insertable = false, updatable = false)
    private Card card;
}
