package com.flashcards.model.entity;

import com.flashcards.model.enums.StudyMode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Entity representing a study session
 * Tracks time spent in different study modes
 * Extends BaseEntity for UUID primary key and audit fields
 */
@Entity
@Table(name = "study_sessions", indexes = {
        @Index(name = "idx_study_sessions_user_id", columnList = "user_id"),
        @Index(name = "idx_study_sessions_mode", columnList = "mode"),
        @Index(name = "idx_study_sessions_start_time", columnList = "start_time")
})
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySession extends BaseEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "deck_id", columnDefinition = "uuid")
    private UUID deckId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StudyMode mode;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(name = "cards_studied")
    private Integer cardsStudied;

    @PrePersist
    protected void calculateDuration() {
        if (startTime != null && endTime != null) {
            durationSeconds = (int) java.time.Duration.between(startTime, endTime).getSeconds();
        }
    }
}
