package com.flashcards.dto.response;

import com.flashcards.model.enums.SourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for Deck
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeckResponse {

    private Long id;
    private Long userId;
    private Long folderId;
    private String title;
    private String description;
    private SourceType sourceType;
    private String sourceId;
    private Integer cardCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastViewedAt;
}
