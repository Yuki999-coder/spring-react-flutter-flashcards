package com.flashcards.exception;

import java.util.UUID;

/**
 * Exception thrown when a card is not found or has been soft-deleted
 */
public class CardNotFoundException extends RuntimeException {

    public CardNotFoundException(String message) {
        super(message);
    }

    public CardNotFoundException(Long cardId) {
        super("Card not found: " + cardId);
    }

    public CardNotFoundException(UUID cardId) {
        super("Card not found: " + cardId);
    }
}
