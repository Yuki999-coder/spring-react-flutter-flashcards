package com.flashcards.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for importing cards from text
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportCardsRequest {
    
    @NotBlank(message = "Content cannot be blank")
    private String content; // Raw text content to import
    
    private String delimiter; // Optional: "tab", "comma", "semicolon" (auto-detect if null)
}
