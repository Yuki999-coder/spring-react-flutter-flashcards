package com.flashcards.model.entity;

import com.flashcards.model.enums.SourceType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

/**
 * Deck Entity
 * Represents a collection of flashcards
 * Supports soft delete functionality
 */
@Entity
@Table(name = "decks")
@SQLDelete(sql = "UPDATE decks SET is_deleted = true WHERE id = ?")
@Where(clause = "is_deleted = false")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "folder_id")
    private Long folderId;

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

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", insertable = false, updatable = false)
    private Folder folder;
}
