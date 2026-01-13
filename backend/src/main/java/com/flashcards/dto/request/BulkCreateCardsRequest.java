package com.flashcards.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Wrapper for bulk card creation requests
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateCardsRequest {

    @NotEmpty(message = "At least one card is required")
    @Valid
    private List<CreateCardRequest> cards;
}
