package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Sync Data Response DTO
 * Returns all changed entities since lastSyncTime for mobile offline-first sync
 * Note: UUIDs are serialized as Strings for JSON compatibility
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncDataResponse {

    private Instant serverTime;
    private List<DeckSyncData> decks;
    private List<CardSyncData> cards;
    private List<StudyLogSyncData> studyLogs;
    private List<CardProgressSyncData> cardProgress;
    private List<FolderSyncData> folders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeckSyncData {
        private String id;  // UUID serialized as String
        private String userId;  // UUID serialized as String
        private String folderId;  // UUID serialized as String (nullable)
        private String title;
        private String description;
        private String sourceType;
        private String sourceId;
        private Instant deletedAt;  // NULL = not deleted
        private Instant createdAt;
        private Instant updatedAt;
        private Instant lastViewedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardSyncData {
        private String id;  // UUID serialized as String
        private String deckId;  // UUID serialized as String
        private String term;
        private String definition;
        private String example;
        private String imageUrl;
        private String audioUrl;
        private Integer position;
        private List<String> tags;
        private String sourceCardId;
        private Boolean isStarred;
        private Instant deletedAt;  // NULL = not deleted
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudyLogSyncData {
        private String id;  // UUID serialized as String
        private String userId;  // UUID serialized as String
        private String cardId;  // UUID serialized as String
        private String grade;
        private String action;
        private Integer timeTakenMs;
        private Instant reviewedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardProgressSyncData {
        private String id;  // UUID serialized as String
        private String userId;  // UUID serialized as String
        private String cardId;  // UUID serialized as String
        private String learningState;
        private Instant nextReview;
        private Integer interval;
        private Float easeFactor;
        private Integer repetitions;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FolderSyncData {
        private String id;  // UUID serialized as String
        private String userId;  // UUID serialized as String
        private String name;
        private String color;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
