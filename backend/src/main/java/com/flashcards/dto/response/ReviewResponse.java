package com.flashcards.dto.response;

import com.flashcards.model.enums.LearningState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for CardProgress/Review result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private Long id;
    private Long userId;
    private Long cardId;
    private LearningState learningState;
    private LocalDateTime nextReview;
    private Integer interval;
    private Float easeFactor;
    private Integer repetitions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Card information for frontend display
    private CardResponse card;
}
