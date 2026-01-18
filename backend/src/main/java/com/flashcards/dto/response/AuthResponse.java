package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for authentication (login/register)
 * Contains JWT token and user information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String type = "Bearer";
    private String userId;
    private String email;
    private String message;

    /**
     * Create AuthResponse with token and user info
     */
    public static AuthResponse of(String token, String userId, String email) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(userId)
                .email(email)
                .build();
    }

    /**
     * Create AuthResponse with message only
     */
    public static AuthResponse withMessage(String message) {
        return AuthResponse.builder()
                .message(message)
                .build();
    }
}
