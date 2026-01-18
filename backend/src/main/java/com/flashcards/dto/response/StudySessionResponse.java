package com.flashcards.dto.response;

import com.flashcards.model.enums.StudyMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response DTO for StudySession
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionResponse {

    private String id;
    private String userId;
    private String deckId;
    private StudyMode mode;
    private Instant startTime;
    private Instant endTime;
    private Integer durationSeconds;
    private Integer cardsStudied;
    private Instant createdAt;
}
