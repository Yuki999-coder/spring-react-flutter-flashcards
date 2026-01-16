package com.flashcards.service;

import com.flashcards.dto.request.CreateDeckRequest;
import com.flashcards.dto.request.UpdateDeckRequest;
import com.flashcards.dto.response.DeckResponse;
import com.flashcards.exception.DeckNotFoundException;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.Deck;
import com.flashcards.model.entity.User;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.DeckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Deck Service
 * Manages deck CRUD operations with security and soft delete
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;
    private final CardRepository cardRepository;

    /**
     * Create a new deck for a user
     *
     * @param user Authenticated user
     * @param request Deck creation data
     * @return Created deck response
     */
    @Transactional
    public DeckResponse createDeck(User user, CreateDeckRequest request) {
        log.info("Creating deck for user {}: title={}", user.getId(), request.getTitle());

        Deck deck = Deck.builder()
                .userId(user.getId())
                .title(request.getTitle())
                .description(request.getDescription())
                .sourceType(request.getSourceType())
                .sourceId(request.getSourceId())
                .isDeleted(false)
                .build();

        Deck savedDeck = deckRepository.save(deck);
        log.info("Deck created: id={}, userId={}", savedDeck.getId(), user.getId());

        return toDeckResponse(savedDeck);
    }

    /**
     * Update an existing deck
     * Security: Only deck owner can update
     *
     * @param user Authenticated user
     * @param deckId Deck ID to update
     * @param request Updated deck data
     * @return Updated deck response
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional
    public DeckResponse updateDeck(User user, Long deckId, UpdateDeckRequest request) {
        log.info("Updating deck {}: user={}", deckId, user.getId());

        Deck deck = getDeckWithOwnershipCheck(user.getId(), deckId);

        // Update fields
        deck.setTitle(request.getTitle());
        deck.setDescription(request.getDescription());

        Deck updatedDeck = deckRepository.save(deck);
        log.info("Deck updated: id={}", deckId);

        return toDeckResponse(updatedDeck);
    }

    /**
     * Soft delete a deck
     * Security: Only deck owner can delete
     * IMPORTANT: Does NOT call repository.delete()
     * Sets isDeleted = true and saves the entity
     *
     * @param user Authenticated user
     * @param deckId Deck ID to delete
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional
    public void deleteDeck(User user, Long deckId) {
        log.info("Soft deleting deck {}: user={}", deckId, user.getId());

        Deck deck = getDeckWithOwnershipCheck(user.getId(), deckId);

        // Soft delete: Set isDeleted flag and save
        // DO NOT call repository.delete(deck)
        deck.setIsDeleted(true);
        deckRepository.save(deck);

        log.info("Deck soft deleted: id={}, userId={}", deckId, user.getId());
    }

    /**
     * Get a deck by ID with ownership verification
     *
     * @param user Authenticated user
     * @param deckId Deck ID
     * @return Deck response
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional(readOnly = true)
    public DeckResponse getDeckById(User user, Long deckId) {
        log.debug("Getting deck {}: user={}", deckId, user.getId());

        Deck deck = getDeckWithOwnershipCheck(user.getId(), deckId);
        return toDeckResponse(deck);
    }

    /**
     * Get all decks for a user
     * Auto-filters soft-deleted decks via @Where clause
     *
     * @param user Authenticated user
     * @return List of user's decks
     */
    @Transactional(readOnly = true)
    public List<DeckResponse> getAllDecks(User user) {
        log.debug("Getting all decks for user {}", user.getId());

        List<Deck> decks = deckRepository.findAllByUserId(user.getId());
        
        return decks.stream()
                .map(this::toDeckResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get deck count for a user
     *
     * @param user Authenticated user
     * @return Number of decks
     */
    @Transactional(readOnly = true)
    public long getDeckCount(User user) {
        return deckRepository.countByUserId(user.getId());
    }

    /**
     * Update deck last viewed timestamp
     * Uses native query to avoid triggering @UpdateTimestamp on updatedAt
     */
    @Transactional
    public void updateLastViewed(User user, Long deckId) {
        log.info("Updating deck last viewed: deckId={}, userId={}", deckId, user.getId());
        
        // Use native query to update only last_viewed_at without triggering updated_at
        int rowsUpdated = deckRepository.updateLastViewedAt(
            deckId, 
            user.getId(), 
            java.time.LocalDateTime.now()
        );
        
        if (rowsUpdated == 0) {
            log.warn("Failed to update last viewed: deckId={}, userId={}", deckId, user.getId());
            throw new com.flashcards.exception.DeckNotFoundException(deckId);
        }
        
        log.debug("Deck last viewed updated: deckId={}", deckId);
    }

    /**
     * Internal method: Get deck and verify ownership
     * Throws exceptions if not found or unauthorized
     */
    private Deck getDeckWithOwnershipCheck(Long userId, Long deckId) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> {
                    log.warn("Deck not found or unauthorized: deckId={}, userId={}", deckId, userId);
                    return new DeckNotFoundException(deckId);
                });

        // Verify ownership (defense in depth)
        if (!deck.getUserId().equals(userId)) {
            log.warn("Ownership verification failed: deckId={}, userId={}, ownerId={}", 
                     deckId, userId, deck.getUserId());
            throw new UnauthorizedException();
        }

        return deck;
    }

    /**
     * Convert Deck entity to DeckResponse DTO
     * Made public so FolderService can use it
     */
    public DeckResponse toDeckResponse(Deck deck) {
        // Count cards in this deck (excludes soft-deleted cards)
        long cardCount = cardRepository.countByDeckId(deck.getId());

        return DeckResponse.builder()
                .id(deck.getId())
                .userId(deck.getUserId())
                .folderId(deck.getFolderId())
                .title(deck.getTitle())
                .description(deck.getDescription())
                .sourceType(deck.getSourceType())
                .sourceId(deck.getSourceId())
                .cardCount((int) cardCount)
                .createdAt(deck.getCreatedAt())
                .updatedAt(deck.getUpdatedAt())
                .lastViewedAt(deck.getLastViewedAt())
                .build();
    }
}
