package com.flashcards.dto.response;

import com.flashcards.model.enums.LearningState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response DTO for CardProgress/Review result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private String id;
    private String userId;
    private String cardId;
    private LearningState learningState;
    private Instant nextReview;
    private Integer interval;
    private Float easeFactor;
    private Integer repetitions;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Card information for frontend display
    private CardResponse card;
}
