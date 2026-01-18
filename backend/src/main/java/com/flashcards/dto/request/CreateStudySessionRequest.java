package com.flashcards.dto.request;

import com.flashcards.model.enums.StudyMode;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Request DTO for creating a study session
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStudySessionRequest {

    private String deckId;

    @NotNull(message = "Study mode is required")
    private StudyMode mode;

    @NotNull(message = "Start time is required")
    private Instant startTime;

    @NotNull(message = "End time is required")
    private Instant endTime;

    private Integer cardsStudied;
}
