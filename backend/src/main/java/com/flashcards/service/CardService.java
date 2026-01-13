package com.flashcards.service;

import com.flashcards.dto.request.CreateCardRequest;
import com.flashcards.dto.request.UpdateCardRequest;
import com.flashcards.dto.response.CardResponse;
import com.flashcards.exception.CardNotFoundException;
import com.flashcards.exception.DeckNotFoundException;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.Card;
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
 * Card Service
 * Manages card CRUD operations with security and soft delete
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final DeckRepository deckRepository;

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

        // Verify deck exists and user owns it
        Deck deck = verifyDeckOwnership(user.getId(), request.getDeckId());

        // Calculate next position (max position + 1)
        int nextPosition = calculateNextPosition(request.getDeckId());

        Card card = Card.builder()
                .deckId(request.getDeckId())
                .term(request.getTerm())
                .definition(request.getDefinition())
                .example(request.getExample())
                .imageUrl(request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .position(nextPosition)
                .tags(request.getTags())
                .isDeleted(false)
                .build();

        Card savedCard = cardRepository.save(card);
        log.info("Card created: id={}, deckId={}, position={}", 
                 savedCard.getId(), savedCard.getDeckId(), savedCard.getPosition());

        return toCardResponse(savedCard);
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

        Long deckId = requests.get(0).getDeckId();
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
                    .isDeleted(false)
                    .build();
            
            cards.add(card);
        }

        // Save all cards in one batch
        List<Card> savedCards = cardRepository.saveAll(cards);
        log.info("Bulk created {} cards for deck {}", savedCards.size(), deckId);

        // Convert to responses
        return savedCards.stream()
                .map(this::toCardResponse)
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
    public CardResponse updateCard(User user, Long cardId, UpdateCardRequest request) {
        log.info("Updating card {}: user={}", cardId, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);

        // Update fields
        card.setTerm(request.getTerm());
        card.setDefinition(request.getDefinition());
        card.setExample(request.getExample());
        card.setImageUrl(request.getImageUrl());
        card.setAudioUrl(request.getAudioUrl());
        card.setTags(request.getTags());

        Card updatedCard = cardRepository.save(card);
        log.info("Card updated: id={}", cardId);

        return toCardResponse(updatedCard);
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
    public void deleteCard(User user, Long cardId) {
        log.info("Soft deleting card {}: user={}", cardId, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);

        // Soft delete: Set isDeleted flag and save
        // DO NOT call repository.delete(card)
        card.setIsDeleted(true);
        cardRepository.save(card);

        log.info("Card soft deleted: id={}, deckId={}, userId={}", 
                 cardId, card.getDeckId(), user.getId());
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
    public CardResponse getCardById(User user, Long cardId) {
        log.debug("Getting card {}: user={}", cardId, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);
        return toCardResponse(card);
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
    public List<CardResponse> getCardsByDeck(User user, Long deckId) {
        log.debug("Getting cards for deck {}: user={}", deckId, user.getId());

        // Verify deck ownership first
        verifyDeckOwnership(user.getId(), deckId);

        // Use repository method with join and ownership check
        List<Card> cards = cardRepository.findAllByDeckIdAndDeckUserIdOrderByPositionAsc(deckId, user.getId());

        return cards.stream()
                .map(this::toCardResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get card count for a deck
     *
     * @param deckId Deck ID
     * @return Number of cards (excludes soft-deleted)
     */
    @Transactional(readOnly = true)
    public long getCardCount(Long deckId) {
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
    public CardResponse updateCardPosition(User user, Long cardId, int newPosition) {
        log.info("Updating card {} position to {}: user={}", cardId, newPosition, user.getId());

        Card card = getCardWithOwnershipCheck(user.getId(), cardId);
        card.setPosition(newPosition);
        
        Card updatedCard = cardRepository.save(card);
        log.info("Card position updated: id={}, position={}", cardId, newPosition);

        return toCardResponse(updatedCard);
    }

    /**
     * Internal method: Verify deck exists and user owns it
     */
    private Deck verifyDeckOwnership(Long userId, Long deckId) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> {
                    log.warn("Deck not found or unauthorized: deckId={}, userId={}", deckId, userId);
                    return new DeckNotFoundException(deckId);
                });

        // Check if deck is soft-deleted
        if (Boolean.TRUE.equals(deck.getIsDeleted())) {
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
    private Card getCardWithOwnershipCheck(Long userId, Long cardId) {
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
    private int calculateNextPosition(Long deckId) {
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
     * Convert Card entity to CardResponse DTO
     */
    private CardResponse toCardResponse(Card card) {
        return CardResponse.builder()
                .id(card.getId())
                .deckId(card.getDeckId())
                .term(card.getTerm())
                .definition(card.getDefinition())
                .example(card.getExample())
                .imageUrl(card.getImageUrl())
                .audioUrl(card.getAudioUrl())
                .position(card.getPosition())
                .tags(card.getTags())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
