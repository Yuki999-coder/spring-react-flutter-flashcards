package com.flashcards.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ReviewResponse {
    private String id;
    private String cardId;
    private Float easeFactor;
    private Integer interval;
    private Integer repetitions;
    private Instant nextReview;
    private Instant lastReview;
    private String learningState;
}
