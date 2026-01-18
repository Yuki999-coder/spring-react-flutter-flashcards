package com.flashcards.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Base Entity
 * Provides common fields for all entities:
 * - UUID primary key
 * - Audit timestamps (createdAt, updatedAt, deletedAt)
 * For offline-first mobile sync support
 */
@MappedSuperclass
@Data
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Soft delete timestamp
     * Null = not deleted
     * Not null = deleted at this time
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /**
     * Check if entity is soft-deleted
     */
    @Transient
    public boolean isDeleted() {
        return deletedAt != null;
    }

    /**
     * Soft delete this entity
     */
    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    /**
     * Restore soft-deleted entity
     */
    public void restore() {
        this.deletedAt = null;
    }
}
