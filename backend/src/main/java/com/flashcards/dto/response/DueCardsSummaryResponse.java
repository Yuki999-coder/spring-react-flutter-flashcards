package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for due cards summary
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DueCardsSummaryResponse {

    /**
     * Total number of due cards across all decks
     */
    private Integer totalDueCards;

    /**
     * List of decks with due cards
     */
    private List<DeckDueInfo> decksDue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeckDueInfo {
        private String deckId;
        private String deckTitle;
        private Integer dueCount;
    }
}
