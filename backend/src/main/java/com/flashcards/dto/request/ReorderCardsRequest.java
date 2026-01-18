package com.flashcards.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for reordering cards
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReorderCardsRequest {

    /**
     * List of card IDs in the new order (as Strings for UUID serialization)
     * Index in the list represents the new position
     */
    @NotNull(message = "Card IDs are required")
    private List<String> cardIds;
}
