package com.flashcards.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new folder
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFolderRequest {
    
    @NotBlank(message = "Folder name is required")
    @Size(min = 1, max = 255, message = "Folder name must be between 1 and 255 characters")
    private String name;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
}
