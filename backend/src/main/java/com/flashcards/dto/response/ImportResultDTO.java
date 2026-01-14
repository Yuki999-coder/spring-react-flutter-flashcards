package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for import operation result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResultDTO {
    
    private Integer totalLines; // Total lines in input
    private Integer successCount; // Successfully imported cards
    private Integer failedCount; // Failed imports
    private List<String> errors; // Error messages
    private List<CardResponse> importedCards; // Cards that were imported
}
