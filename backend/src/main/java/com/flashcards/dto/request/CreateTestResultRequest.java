package com.flashcards.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for creating a test result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTestResultRequest {

    @NotNull(message = "Deck ID is required")
    private String deckId;

    @NotNull(message = "Score is required")
    @DecimalMin(value = "0.0", message = "Score must be at least 0")
    @DecimalMax(value = "100.0", message = "Score must not exceed 100")
    private BigDecimal score;

    @NotNull(message = "Correct count is required")
    @Min(value = 0, message = "Correct count must be non-negative")
    private Integer correctCount;

    @NotNull(message = "Wrong count is required")
    @Min(value = 0, message = "Wrong count must be non-negative")
    private Integer wrongCount;

    @NotNull(message = "Skipped count is required")
    @Min(value = 0, message = "Skipped count must be non-negative")
    private Integer skippedCount;

    @NotNull(message = "Total questions is required")
    @Min(value = 1, message = "Total questions must be at least 1")
    private Integer totalQuestions;

    @NotNull(message = "Duration is required")
    @Min(value = 0, message = "Duration must be non-negative")
    private Integer durationSeconds;
}
