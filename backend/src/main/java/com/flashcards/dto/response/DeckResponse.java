package com.flashcards.dto.response;

import com.flashcards.model.enums.SourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response DTO for Deck
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeckResponse {

    private String id;
    private String userId;
    private String folderId;
    private String title;
    private String description;
    private SourceType sourceType;
    private String sourceId;
    private Integer cardCount;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastViewedAt;
}
