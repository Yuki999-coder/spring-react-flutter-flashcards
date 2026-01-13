package com.flashcards.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for creating a new card
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCardRequest {

    @NotNull(message = "Deck ID is required")
    private Long deckId;

    @NotNull(message = "Term is required")
    private String term;

    @NotNull(message = "Definition is required")
    private String definition;

    private String example;

    private String imageUrl;

    private String audioUrl;

    private List<String> tags;
}
