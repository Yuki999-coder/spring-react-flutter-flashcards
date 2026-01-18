package com.flashcards.model.entity;

import com.flashcards.model.enums.SourceType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Where;

import java.time.Instant;
import java.util.UUID;

/**
 * Deck Entity
 * Represents a collection of flashcards
 * Extends BaseEntity for UUID primary key and audit fields
 * Supports soft delete via deletedAt field
 */
@Entity
@Table(name = "decks")
@Where(clause = "deleted_at IS NULL")
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deck extends BaseEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;
    
    @Column(name = "folder_id", columnDefinition = "uuid")
    private UUID folderId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    @Builder.Default
    private SourceType sourceType = SourceType.LOCAL;

    @Column(name = "source_id", length = 255)
    private String sourceId;

    @Column(name = "last_viewed_at")
    private Instant lastViewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", insertable = false, updatable = false)
    private Folder folder;
}
