package com.flashcards.service;

import com.flashcards.dto.request.CreateCardRequest;
import com.flashcards.dto.request.ReorderCardsRequest;
import com.flashcards.dto.request.UpdateCardRequest;
import com.flashcards.dto.response.CardResponse;
import com.flashcards.dto.response.DueCardsSummaryResponse;
import com.flashcards.exception.CardNotFoundException;
import com.flashcards.exception.DeckNotFoundException;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.Card;
import com.flashcards.model.entity.CardProgress;
import com.flashcards.model.entity.Deck;
import com.flashcards.model.entity.User;
import com.flashcards.repository.CardProgressRepository;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.DeckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Card Service
 * Manages card CRUD operations with security and soft delete
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final DeckRepository deckRepository;
    private final CardProgressRepository cardProgressRepository;

    /**
     * Add a new card to a deck
     * Auto-calculates position as max(position) + 1
     * Security: Verifies deck ownership
     *
     * @param user Authenticated user
     * @param request Card creation data
     * @return Created card response
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional
    public CardResponse addCardToDeck(User user, CreateCardRequest request) {
        log.info("Adding card to deck {}: user={}, term={}", 
                 request.getDeckId(), user.getId(), request.getTerm());

        // Convert String deckId to UUID
        UUID deckId = UUID.fromString(request.getDeckId());

        // Verify deck exists and user owns it
        Deck deck = verifyDeckOwnership(user.getId(), deckId);

        // Calculate next position (max position + 1)
        int nextPosition = calculateNextPosition(deckId);

        Card card = Card.builder()
                .deckId(deckId)
                .term(request.getTerm())
                .definition(request.getDefinition())
                .example(request.getExample())
                .imageUrl(request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .position(nextPosition)
                .tags(request.getTags())
                .build();

        Card savedCard = cardRepository.save(card);
        log.info("Card created: id={}, deckId={}, position={}", 
                 savedCard.getId(), savedCard.getDeckId(), savedCard.getPosition());

        return toCardResponse(savedCard, user);
    }

    /**
     * Bulk add cards to a deck
     * All cards are saved in a single transaction
     * Security: Verifies deck ownership once
     *
     * @param user Authenticated user
     * @param requests List of card creation data
     * @return List of created card responses
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional
    public List<CardResponse> bulkAddCardsToDeck(User user, List<CreateCardRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            log.warn("Bulk add called with empty request list");
            return List.of();
        }

        String deckIdStr = requests.get(0).getDeckId();
        UUID deckId = UUID.fromString(deckIdStr);
        log.info("Bulk adding {} cards to deck {}: user={}", 
                 requests.size(), deckId, user.getId());

        // Verify deck exists and user owns it (only once)
        Deck deck = verifyDeckOwnership(user.getId(), deckId);

        // Validate HTML content
        for (int i = 0; i < requests.size(); i++) {
            CreateCardRequest request = requests.get(i);
            log.debug("Validating card {}: term='{}', definition='{}'", 
                     i, request.getTerm(), request.getDefinition());
            
            if (!hasTextContent(request.getTerm())) {
                throw new IllegalArgumentException("Term at index " + i + " is empty or contains only HTML tags");
            }
            if (!hasTextContent(request.getDefinition())) {
                throw new IllegalArgumentException("Definition at index " + i + " is empty or contains only HTML tags");
            }
        }

        // Get starting position
        int startPosition = calculateNextPosition(deckId);

        // Create all cards
        List<Card> cards = new java.util.ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            CreateCardRequest request = requests.get(i);
            
            Card card = Card.builder()
                    .deckId(deckId)
                    .term(request.getTerm())
                    .definition(request.getDefinition())
                    .example(request.getExample())
                    .imageUrl(request.getImageUrl())
                    .audioUrl(request.getAudioUrl())
                    .position(startPosition + i)
                    .tags(request.getTags())
                    .build();
            
            cards.add(card);
        }

        // Save all cards in one batch
        List<Card> savedCards = cardRepository.saveAll(cards);
        log.info("Bulk created {} cards for deck {}", savedCards.size(), deckId);

        // Convert to responses
        return savedCards.stream()
                .map(card -> toCardResponse(card, user))
                .collect(Collectors.toList());
    }

    /**
     * Check if HTML string has actual text content
     */
    private boolean hasTextContent(String html) {
        if (html == null || html.isBlank()) {
            return false;
        }
        String textContent = html.replaceAll("<[^>]*>", "").trim();
        return !textContent.isEmpty();
    }

    /**
     * Update an existing card
     * Security: Verifies card ownership through deck
     *
     * @param user Authenticated user
     * @param cardId Card ID to update
     * @param request Updated card data
     * @return Updated card response
     * @throws CardNotFoundException if card not found
     * @throws UnauthorizedException if user doesn't own the card
     */
    @Transactional
    public CardResponse updateCard(User user, UUID cardId, UpdateCardRequest request) {
        log.info("Updating card {}: user={}", cardId, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);

        // Update fields
        card.setTerm(request.getTerm());
        card.setDefinition(request.getDefinition());
        card.setExample(request.getExample());
        card.setImageUrl(request.getImageUrl());
        card.setAudioUrl(request.getAudioUrl());
        card.setTags(request.getTags());
        
        // Update isStarred if provided
        if (request.getIsStarred() != null) {
            card.setIsStarred(request.getIsStarred());
        }

        Card updatedCard = cardRepository.save(card);
        log.info("Card updated: id={}", cardId);

        return toCardResponse(updatedCard, user);
    }

    /**
     * Soft delete a card
     * Security: Verifies card ownership through deck
     * IMPORTANT: Does NOT call repository.delete()
     * Sets isDeleted = true and saves the entity
     *
     * @param user Authenticated user
     * @param cardId Card ID to delete
     * @throws CardNotFoundException if card not found
     * @throws UnauthorizedException if user doesn't own the card
     */
    @Transactional
    public void deleteCard(User user, UUID cardId) {
        log.info("Soft deleting card {}: user={}", cardId, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);

        // Soft delete: Set deletedAt timestamp
        // DO NOT call repository.delete(card)
        card.softDelete();
        cardRepository.save(card);

        log.info("Card soft deleted: id={}, deckId={}, userId={}", 
                 cardId, card.getDeckId(), user.getId());
    }

    /**
     * Delete multiple cards (bulk delete)
     *
     * @param user Authenticated user
     * @param cardIds List of card IDs to delete
     * @throws CardNotFoundException if any card not found
     * @throws UnauthorizedException if user doesn't own any of the cards
     */
    @Transactional
    public void deleteCards(User user, List<UUID> cardIds) {
        if (cardIds == null || cardIds.isEmpty()) {
            log.warn("Empty card IDs list for bulk delete: userId={}", user.getId());
            return;
        }

        log.info("Soft deleting {} cards: user={}, cardIds={}", cardIds.size(), user.getId(), cardIds);

        // Fetch all cards in one query and verify ownership
        List<Card> cards = cardRepository.findAllById(cardIds);
        
        if (cards.size() != cardIds.size()) {
            log.error("Some cards not found. Requested: {}, Found: {}", cardIds.size(), cards.size());
            throw new CardNotFoundException("Một hoặc nhiều thẻ không tồn tại");
        }

        // Verify ownership for all cards
        for (Card card : cards) {
            if (!card.getDeck().getUserId().equals(user.getId())) {
                log.error("User {} does not own card {}", user.getId(), card.getId());
                throw new UnauthorizedException("Bạn không có quyền xóa thẻ này");
            }
            card.softDelete();
        }

        // Bulk save
        cardRepository.saveAll(cards);
        log.info("Bulk deleted {} cards for userId={}", cards.size(), user.getId());
    }

    /**
     * Get a card by ID with ownership verification
     *
     * @param user Authenticated user
     * @param cardId Card ID
     * @return Card response
     * @throws CardNotFoundException if card not found
     * @throws UnauthorizedException if user doesn't own the card
     */
    @Transactional(readOnly = true)
    public CardResponse getCardById(User user, UUID cardId) {
        log.debug("Getting card {}: user={}", cardId, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);
        return toCardResponse(card, user);
    }

    /**
     * Get all cards in a deck
     * Security: Verifies deck ownership
     * Auto-filters soft-deleted cards via @Where clause
     * Ordered by position ascending
     *
     * @param user Authenticated user
     * @param deckId Deck ID
     * @return List of cards in the deck
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional(readOnly = true)
    public List<CardResponse> getCardsByDeck(User user, UUID deckId) {
        log.debug("Getting cards for deck {}: user={}", deckId, user.getId());

        // Verify deck ownership first
        verifyDeckOwnership(user.getId(), deckId);

        // Use repository method with join and ownership check
        List<Card> cards = cardRepository.findAllByDeckIdAndDeckUserIdOrderByPositionAsc(deckId, user.getId());

        return cards.stream()
                .map(card -> toCardResponse(card, user))
                .collect(Collectors.toList());
    }

    /**
     * Get card count for a deck
     *
     * @param deckId Deck ID
     * @return Number of cards (excludes soft-deleted)
     */
    @Transactional(readOnly = true)
    public long getCardCount(UUID deckId) {
        return cardRepository.countByDeckId(deckId);
    }

    /**
     * Update card positions (for reordering)
     *
     * @param user Authenticated user
     * @param cardId Card ID to reposition
     * @param newPosition New position value
     * @return Updated card response
     */
    @Transactional
    public CardResponse updateCardPosition(User user, UUID cardId, int newPosition) {
        log.info("Updating card {} position to {}: user={}", cardId, newPosition, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);
        card.setPosition(newPosition);
        
        Card updatedCard = cardRepository.save(card);
        log.info("Card position updated: id={}, position={}", cardId, newPosition);

        return toCardResponse(updatedCard, user);
    }

    /**
     * Reorder cards in a deck
     * Updates position of multiple cards based on new order
     *
     * @param user Authenticated user
     * @param deckId Deck ID
     * @param request Request with card IDs in new order
     * @return List of updated cards
     */
    @Transactional
    public List<CardResponse> reorderCards(User user, UUID deckId, ReorderCardsRequest request) {
        log.info("Reordering cards in deck {}: user={}, count={}", 
                 deckId, user.getId(), request.getCardIds().size());

        // Convert String card IDs to UUID
        List<UUID> cardIds = new ArrayList<>();
        for (String id : request.getCardIds()) {
            cardIds.add(UUID.fromString(id));
        }

        // Verify deck ownership
        verifyDeckOwnership(user.getId(), deckId);

        // Fetch all cards by IDs and verify they belong to the deck
        List<Card> cards = cardRepository.findAllById(cardIds);
        
        // Verify all cards belong to this deck
        for (Card card : cards) {
            if (!card.getDeckId().equals(deckId)) {
                log.warn("Card {} does not belong to deck {}", card.getId(), deckId);
                throw new UnauthorizedException();
            }
        }

        // Update positions based on the order in cardIds list
        for (int i = 0; i < cardIds.size(); i++) {
            UUID cardId = cardIds.get(i);
            Card card = cards.stream()
                    .filter(c -> c.getId().equals(cardId))
                    .findFirst()
                    .orElseThrow(() -> new CardNotFoundException(cardId));
            
            card.setPosition(i);
        }

        // Save all updated cards
        List<Card> updatedCards = cardRepository.saveAll(cards);
        log.info("Cards reordered successfully: deckId={}, count={}", deckId, updatedCards.size());

        return updatedCards.stream()
                .map(card -> toCardResponse(card, user))
                .collect(Collectors.toList());
    }

    /**
     * Internal method: Verify deck exists and user owns it
     */
    private Deck verifyDeckOwnership(UUID userId, UUID deckId) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> {
                    log.warn("Deck not found or unauthorized: deckId={}, userId={}", deckId, userId);
                    return new DeckNotFoundException(deckId);
                });

        // Check if deck is soft-deleted
        if (deck.isDeleted()) {
            log.warn("Attempted to access deleted deck: deckId={}", deckId);
            throw new DeckNotFoundException(deckId);
        }

        // Verify ownership (defense in depth)
        if (!deck.getUserId().equals(userId)) {
            log.warn("Deck ownership verification failed: deckId={}, userId={}, ownerId={}", 
                     deckId, userId, deck.getUserId());
            throw new UnauthorizedException();
        }

        return deck;
    }

    /**
     * Internal method: Get card and verify ownership through deck
     */
    private Card getCardWithOwnershipCheck(UUID userId, UUID cardId) {
        Card card = cardRepository.findByIdAndDeckUserId(cardId, userId)
                .orElseThrow(() -> {
                    log.warn("Card not found or unauthorized: cardId={}, userId={}", cardId, userId);
                    return new CardNotFoundException(cardId);
                });

        // Verify deck ownership
        verifyDeckOwnership(userId, card.getDeckId());

        return card;
    }

    /**
     * Calculate next position for a new card in a deck
     * Returns max(position) + 1, or 0 if deck is empty
     */
    private int calculateNextPosition(UUID deckId) {
        List<Card> existingCards = cardRepository.findAllByDeckIdOrderByPositionAsc(deckId);
        
        if (existingCards.isEmpty()) {
            return 0;
        }

        // Get max position and add 1
        int maxPosition = existingCards.stream()
                .mapToInt(Card::getPosition)
                .max()
                .orElse(-1);

        return maxPosition + 1;
    }

    /**
     * Get difficult cards for cram mode
     * Returns cards with easeFactor < 2.1 OR learningState = 'RELEARNING'
     *
     * @param user Authenticated user
     * @param deckId Deck ID
     * @return List of difficult cards
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional(readOnly = true)
    public List<CardResponse> getDifficultCards(User user, UUID deckId) {
        log.info("Getting difficult cards for deck {}: user={}", deckId, user.getId());

        // Verify deck ownership
        verifyDeckOwnership(user.getId(), deckId);

        List<Card> difficultCards = cardRepository.findDifficultCardsByDeckIdAndUserId(deckId, user.getId());
        
        log.info("Found {} difficult cards in deck {}", difficultCards.size(), deckId);
        
        return difficultCards.stream()
                .map(card -> toCardResponse(card, user))
                .collect(Collectors.toList());
    }

    /**
     * Count difficult cards in a deck
     *
     * @param user Authenticated user
     * @param deckId Deck ID
     * @return Count of difficult cards
     * @throws DeckNotFoundException if deck not found
     * @throws UnauthorizedException if user doesn't own the deck
     */
    @Transactional(readOnly = true)
    public long countDifficultCards(User user, UUID deckId) {
        log.info("Counting difficult cards for deck {}: user={}", deckId, user.getId());

        // Verify deck ownership
        verifyDeckOwnership(user.getId(), deckId);

        long count = cardRepository.countDifficultCardsByDeckIdAndUserId(deckId, user.getId());
        
        log.info("Deck {} has {} difficult cards", deckId, count);
        
        return count;
    }

    /**
     * Convert Card entity to CardResponse DTO with learning progress
     * Public method for use by other services (e.g., SearchService)
     */
    public CardResponse toCardResponse(Card card, User user) {
        // Get card progress for this user
        CardProgress progress = cardProgressRepository.findByUserIdAndCardId(user.getId(), card.getId())
                .orElse(null);
        
        CardResponse.CardResponseBuilder builder = CardResponse.builder()
                .id(card.getId().toString())
                .deckId(card.getDeckId().toString())
                .term(card.getTerm())
                .definition(card.getDefinition())
                .example(card.getExample())
                .imageUrl(card.getImageUrl())
                .audioUrl(card.getAudioUrl())
                .position(card.getPosition())
                .tags(card.getTags())
                .isStarred(card.getIsStarred())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt());
        
        // Add learning progress if exists
        if (progress != null) {
            builder.learningState(progress.getLearningState())
                   .nextReview(progress.getNextReview())
                   .easeFactor(Double.valueOf(progress.getEaseFactor()))
                   .interval(progress.getInterval());
        }
        
        return builder.build();
    }

    /**
     * Get summary of due cards for the user
     * Groups by deck and counts cards that are due for review
     *
     * @param user Authenticated user
     * @return Summary with total due cards and breakdown by deck
     */
    @Transactional(readOnly = true)
    public DueCardsSummaryResponse getDueCardsSummary(User user) {
        log.info("Getting due cards summary for user: {}", user.getId());

        Instant now = Instant.now();
        
        // Get all user's decks (soft-deleted automatically filtered by @Where clause)
        List<Deck> userDecks = deckRepository.findAllByUserId(user.getId());
        
        List<DueCardsSummaryResponse.DeckDueInfo> decksDue = new ArrayList<>();
        int totalDueCards = 0;

        for (Deck deck : userDecks) {
            // Get all cards in this deck (soft-deleted automatically filtered by @Where clause)
            List<Card> deckCards = cardRepository.findAllByDeckIdOrderByPositionAsc(deck.getId());
            
            int deckDueCount = 0;
            
            for (Card card : deckCards) {
                Optional<CardProgress> progressOpt = cardProgressRepository
                        .findByUserIdAndCardId(user.getId(), card.getId());
                
                CardProgress progress = progressOpt.orElse(null);
                
                // Card is due if:
                // 1. No progress (new card)
                // 2. Progress exists and nextReview <= now
                boolean isDue = progress == null || 
                               (progress.getNextReview() != null && 
                                !progress.getNextReview().isAfter(now));
                
                if (isDue) {
                    deckDueCount++;
                }
            }
            
            if (deckDueCount > 0) {
                decksDue.add(DueCardsSummaryResponse.DeckDueInfo.builder()
                        .deckId(deck.getId().toString())
                        .deckTitle(deck.getTitle())
                        .dueCount(deckDueCount)
                        .build());
                
                totalDueCards += deckDueCount;
            }
        }
        
        // Sort by due count descending
        decksDue.sort((a, b) -> b.getDueCount().compareTo(a.getDueCount()));
        
        log.info("User {} has {} total due cards across {} decks", 
                 user.getId(), totalDueCards, decksDue.size());

        return DueCardsSummaryResponse.builder()
                .totalDueCards(totalDueCards)
                .decksDue(decksDue)
                .build();
    }
}
