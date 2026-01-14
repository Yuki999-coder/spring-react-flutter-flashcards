package com.flashcards.exception;

/**
 * Exception thrown when a folder is not found
 */
public class FolderNotFoundException extends RuntimeException {
    public FolderNotFoundException(String message) {
        super(message);
    }
}
