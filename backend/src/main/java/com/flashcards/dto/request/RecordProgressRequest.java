package com.flashcards.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for recording progress from MCQ/WRITTEN/MIXED modes
 * Maps answer correctness to SRS grades automatically
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordProgressRequest {

    /**
     * Learning mode: MCQ, WRITTEN, or MIXED
     */
    @NotBlank(message = "Mode is required")
    @Pattern(regexp = "MCQ|WRITTEN|MIXED", message = "Mode must be MCQ, WRITTEN, or MIXED")
    private String mode;

    /**
     * Whether the answer was correct
     * true -> mapped to GOOD (or EASY for WRITTEN mode)
     * false -> mapped to AGAIN
     */
    @NotNull(message = "isCorrect is required")
    private Boolean isCorrect;

    /**
     * Optional: time taken to answer in milliseconds
     */
    private Integer timeTakenMs;
}
