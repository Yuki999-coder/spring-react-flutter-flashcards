package com.flashcards.dto.response;

import com.flashcards.model.enums.LearningState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Response DTO for Card
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardResponse {

    private String id;
    private String deckId;
    private String term;
    private String definition;
    private String example;
    private String imageUrl;
    private String audioUrl;
    private Integer position;
    private List<String> tags;
    private Boolean isStarred;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Learning progress fields
    private LearningState learningState;
    private Instant nextReview;
    private Double easeFactor;
    private Integer interval;
}
