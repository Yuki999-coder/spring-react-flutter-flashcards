package com.flashcards.controller;

import com.flashcards.dto.request.CreateCardRequest;
import com.flashcards.dto.request.ReorderCardsRequest;
import com.flashcards.dto.request.UpdateCardRequest;
import com.flashcards.dto.response.CardResponse;
import com.flashcards.dto.response.DueCardsSummaryResponse;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.User;
import com.flashcards.repository.UserRepository;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Card Controller
 * REST API endpoints for card management
 * Base URL: /api/v1
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Add a card to a deck
     * POST /api/v1/decks/{deckId}/cards
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID
     * @param request Card creation data
     * @return Created card response
     */
    @PostMapping("/decks/{deckId}/cards")
    public ResponseEntity<CardResponse> addCardToDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId,
            @Valid @RequestBody CreateCardRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/decks/{}/cards - userId: {}, term: {}", 
                 deckId, user.getId(), request.getTerm());

        // Set deckId from path parameter
        request.setDeckId(deckId.toString());

        CardResponse response = cardService.addCardToDeck(user, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Bulk add cards to a deck
     * POST /api/v1/decks/{deckId}/cards/bulk
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID
     * @param requests List of card creation data (sent as array from frontend)
     * @return List of created cards
     */
    @PostMapping("/decks/{deckId}/cards/bulk")
    public ResponseEntity<List<CardResponse>> bulkAddCardsToDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId,
            @RequestBody List<CreateCardRequest> requests) {
        
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/decks/{}/cards/bulk - userId: {}, count: {}", 
                 deckId, user.getId(), requests != null ? requests.size() : 0);

        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Log first request for debugging
        log.debug("First request: term='{}', def='{}'", 
                 requests.get(0).getTerm(), requests.get(0).getDefinition());

        // Set deckId for all requests
        requests.forEach(request -> request.setDeckId(deckId.toString()));

        List<CardResponse> responses = cardService.bulkAddCardsToDeck(user, requests);

        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    /**
     * Get all cards in a deck
     * GET /api/v1/decks/{deckId}/cards
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID
     * @return List of cards in the deck
     */
    @GetMapping("/decks/{deckId}/cards")
    public ResponseEntity<List<CardResponse>> getCardsByDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/{}/cards - userId: {}", deckId, user.getId());

        List<CardResponse> response = cardService.getCardsByDeck(user, deckId);

        return ResponseEntity.ok(response);
    }

    /**
     * Get a specific card by ID
     * GET /api/v1/cards/{id}
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Card ID
     * @return Card response
     */
    @GetMapping("/cards/{id}")
    public ResponseEntity<CardResponse> getCardById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/cards/{} - userId: {}", id, user.getId());

        CardResponse response = cardService.getCardById(user, id);

        return ResponseEntity.ok(response);
    }

    /**
     * Update a card
     * PUT /api/v1/cards/{id}
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Card ID to update
     * @param request Updated card data
     * @return Updated card response
     */
    @PutMapping("/cards/{id}")
    public ResponseEntity<CardResponse> updateCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCardRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("PUT /api/v1/cards/{} - userId: {}, term: {}", 
                 id, user.getId(), request.getTerm());

        CardResponse response = cardService.updateCard(user, id, request);

        return ResponseEntity.ok(response);
    }

    /**
     * Reorder cards in a deck
     * PUT /api/v1/decks/{deckId}/cards/reorder
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID
     * @param request Request with card IDs in new order
     * @return List of updated cards
     */
    @PutMapping("/decks/{deckId}/cards/reorder")
    public ResponseEntity<List<CardResponse>> reorderCards(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId,
            @Valid @RequestBody ReorderCardsRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("PUT /api/v1/decks/{}/cards/reorder - userId: {}, count: {}", 
                 deckId, user.getId(), request.getCardIds().size());

        List<CardResponse> responses = cardService.reorderCards(user, deckId, request);

        return ResponseEntity.ok(responses);
    }

    /**
     * Soft delete a card
     * DELETE /api/v1/cards/{id}
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Card ID to delete
     * @return No content
     */
    @DeleteMapping("/cards/{id}")
    public ResponseEntity<Void> deleteCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        
        User user = getCurrentUser(userDetails);
        log.info("DELETE /api/v1/cards/{} - userId: {}", id, user.getId());

        cardService.deleteCard(user, id);

        return ResponseEntity.noContent().build();
    }

    /**
     * Delete multiple cards
     * DELETE /cards/bulk-delete
     * @param userDetails Current authenticated user
     * @param cardIds List of card IDs to delete
     * @return No content
     */
    @DeleteMapping("/cards/bulk-delete")
    public ResponseEntity<Void> deleteCards(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody List<UUID> cardIds) {
        
        User user = getCurrentUser(userDetails);
        log.info("DELETE /api/v1/cards/batch - userId: {}, cardIds: {}", user.getId(), cardIds);

        cardService.deleteCards(user, cardIds);

        return ResponseEntity.noContent().build();
    }

    /**
     * Update card position (for reordering)
     * PATCH /api/v1/cards/{id}/position
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Card ID
     * @param position New position
     * @return Updated card response
     */
    @PatchMapping("/cards/{id}/position")
    public ResponseEntity<CardResponse> updateCardPosition(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestParam int position) {
        
        User user = getCurrentUser(userDetails);
        log.info("PATCH /api/v1/cards/{}/position - userId: {}, newPosition: {}", 
                 id, user.getId(), position);

        CardResponse response = cardService.updateCardPosition(user, id, position);

        return ResponseEntity.ok(response);
    }

    /**
     * Get card count for a deck
     * GET /api/v1/decks/{deckId}/cards/count
     *
     * @param deckId Deck ID
     * @return Card count
     */
    @GetMapping("/decks/{deckId}/cards/count")
    public ResponseEntity<Long> getCardCount(
            @PathVariable UUID deckId) {
        
        log.info("GET /api/v1/decks/{}/cards/count", deckId);

        long count = cardService.getCardCount(deckId);

        return ResponseEntity.ok(count);
    }

    /**
     * Get summary of due cards for review
     * GET /api/v1/cards/due/summary
     *
     * @param userDetails Authenticated user from JWT token
     * @return Summary of due cards grouped by deck
     */
    @GetMapping("/cards/due/summary")
    public ResponseEntity<DueCardsSummaryResponse> getDueCardsSummary(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/cards/due/summary - userId: {}", user.getId());

        DueCardsSummaryResponse response = cardService.getDueCardsSummary(user);

        return ResponseEntity.ok(response);
    }

    /**
     * Get current authenticated user from UserDetails
     *
     * @param userDetails Authenticated user details from JWT
     * @return User entity
     */
    private User getCurrentUser(UserDetails userDetails) {
        return userDetailsService.getUserByEmail(userDetails.getUsername());
    }
}
