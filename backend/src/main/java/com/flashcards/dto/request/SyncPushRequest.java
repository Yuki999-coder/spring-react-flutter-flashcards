package com.flashcards.dto.request;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Sync Push Request DTO
 * Receives changes from mobile client for offline-first sync
 * Note: Mobile sends UUIDs as Strings (generated offline or from server)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncPushRequest {

    @Valid
    private List<DeckPushData> decks;

    @Valid
    private List<CardPushData> cards;

    @Valid
    private List<StudyLogPushData> studyLogs;

    @Valid
    private List<CardProgressPushData> cardProgress;

    @Valid
    private List<FolderPushData> folders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeckPushData {
        private String id; // UUID as String, mobile-generated for new decks
        private String folderId; // UUID as String (nullable)
        private String title;
        private String description;
        private String sourceType;
        private String sourceId;
        private Instant deletedAt; // Timestamp for soft delete (NULL = not deleted)
        private Instant lastViewedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardPushData {
        private String id; // UUID as String, mobile-generated for new cards
        private String deckId; // UUID as String
        private String term;
        private String definition;
        private String example;
        private String imageUrl;
        private String audioUrl;
        private Integer position;
        private List<String> tags;
        private String sourceCardId;
        private Boolean isStarred;
        private Instant deletedAt; // Timestamp for soft delete (NULL = not deleted)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudyLogPushData {
        private String id; // UUID as String, mobile-generated for new logs
        private String cardId; // UUID as String
        private String grade;
        private String action;
        private Integer timeTakenMs;
        private Instant reviewedAt; // Mobile sets timestamp from offline session
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardProgressPushData {
        private String id; // UUID as String, mobile-generated for new progress
        private String cardId; // UUID as String
        private String learningState;
        private Instant nextReview;
        private Integer interval;
        private Float easeFactor;
        private Integer repetitions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FolderPushData {
        private String id; // UUID as String, mobile-generated for new folders
        private String name;
        private String color;
    }
}
