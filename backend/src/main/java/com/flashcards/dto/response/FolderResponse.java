package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for Folder
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderResponse {
    
    private Long id;
    private String name;
    private String description;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastViewedAt;
    
    // Count of decks in this folder
    private Integer deckCount;
    
    // Optional: List of decks (only populated when requested)
    private List<DeckResponse> decks;
}
