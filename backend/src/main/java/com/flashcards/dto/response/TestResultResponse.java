package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for test result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestResultResponse {
    private Long id;
    private Long deckId;
    private BigDecimal score;
    private Integer correctCount;
    private Integer wrongCount;
    private Integer skippedCount;
    private Integer totalQuestions;
    private Integer durationSeconds;
    private LocalDateTime submittedAt;
}
