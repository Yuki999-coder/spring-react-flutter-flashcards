package com.flashcards.controller;

import com.flashcards.dto.request.CreateDeckRequest;
import com.flashcards.dto.request.ImportCardsRequest;
import com.flashcards.dto.request.UpdateDeckRequest;
import com.flashcards.dto.response.CardResponse;
import com.flashcards.dto.response.DeckResponse;
import com.flashcards.dto.response.ImportResultDTO;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.User;
import com.flashcards.repository.UserRepository;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.CardService;
import com.flashcards.service.DeckService;
import com.flashcards.service.ImportExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Deck Controller
 * REST API endpoints for deck management
 * Base URL: /api/v1/decks
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/decks")
@RequiredArgsConstructor
public class DeckController {

    private final DeckService deckService;
    private final CardService cardService;
    private final ImportExportService importExportService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Create a new deck
     * POST /api/v1/decks
     *
     * @param userDetails Authenticated user from JWT token
     * @param request Deck creation data
     * @return Created deck response
     */
    @PostMapping
    public ResponseEntity<DeckResponse> createDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateDeckRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/decks - userId: {}, title: {}", user.getId(), request.getTitle());

        DeckResponse response = deckService.createDeck(user, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all decks for authenticated user
     * GET /api/v1/decks
     *
     * @param userDetails Authenticated user from JWT token
     * @return List of user's decks
     */
    @GetMapping
    public ResponseEntity<List<DeckResponse>> getAllDecks(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks - userId: {}", user.getId());

        List<DeckResponse> response = deckService.getAllDecks(user);

        return ResponseEntity.ok(response);
    }

    /**
     * Get a specific deck by ID
     * GET /api/v1/decks/{id}
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Deck ID
     * @return Deck response
     */
    @GetMapping("/{id}")
    public ResponseEntity<DeckResponse> getDeckById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/{} - userId: {}", id, user.getId());

        DeckResponse response = deckService.getDeckById(user, id);

        return ResponseEntity.ok(response);
    }

    /**
     * Update a deck
     * PUT /api/v1/decks/{id}
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Deck ID to update
     * @param request Updated deck data
     * @return Updated deck response
     */
    @PutMapping("/{id}")
    public ResponseEntity<DeckResponse> updateDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDeckRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("PUT /api/v1/decks/{} - userId: {}, title: {}", id, user.getId(), request.getTitle());

        DeckResponse response = deckService.updateDeck(user, id, request);

        return ResponseEntity.ok(response);
    }

    /**
     * Soft delete a deck
     * DELETE /api/v1/decks/{id}
     *
     * @param userDetails Authenticated user from JWT token
     * @param id Deck ID to delete
     * @return No content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        
        User user = getCurrentUser(userDetails);
        log.info("DELETE /api/v1/decks/{} - userId: {}", id, user.getId());

        deckService.deleteDeck(user, id);

        return ResponseEntity.noContent().build();
    }

    /**
     * Get deck count for user
     * GET /api/v1/decks/count
     *
     * @param userDetails Authenticated user from JWT token
     * @return Deck count
     */
    @GetMapping("/count")
    public ResponseEntity<Long> getDeckCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/count - userId: {}", user.getId());

        long count = deckService.getDeckCount(user);

        return ResponseEntity.ok(count);
    }

    /**
     * Import cards from text
     * POST /api/v1/decks/{deckId}/import
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID to import cards into
     * @param request Import request with content and delimiter
     * @return Import result with statistics
     */
    @PostMapping("/{deckId}/import")
    public ResponseEntity<ImportResultDTO> importCards(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId,
            @Valid @RequestBody ImportCardsRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/decks/{}/import - userId: {}", deckId, user.getId());

        ImportResultDTO result = importExportService.importCards(user, deckId, request);

        return ResponseEntity.ok(result);
    }

    /**
     * Export cards to CSV
     * GET /api/v1/decks/{deckId}/export/csv
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID to export
     * @return CSV file as text
     */
    @GetMapping("/{deckId}/export/csv")
    public ResponseEntity<String> exportToCSV(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/{}/export/csv - userId: {}", deckId, user.getId());

        String csv = importExportService.exportToCSV(user, deckId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"deck-" + deckId + ".csv\"");

        return ResponseEntity.ok()
                .headers(headers)
                .body(csv);
    }

    /**
     * Export cards to Quizlet format (Tab-delimited)
     * GET /api/v1/decks/{deckId}/export/quizlet
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID to export
     * @return Quizlet format text
     */
    @GetMapping("/{deckId}/export/quizlet")
    public ResponseEntity<String> exportToQuizlet(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/{}/export/quizlet - userId: {}", deckId, user.getId());

        String text = importExportService.exportToQuizlet(user, deckId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);

        return ResponseEntity.ok()
                .headers(headers)
                .body(text);
    }

    /**
     * Get difficult cards for cram mode
     * GET /api/v1/decks/{deckId}/cards/difficult
     * Returns cards with easeFactor < 2.1 OR learningState = 'RELEARNING'
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID
     * @return List of difficult cards
     */
    @GetMapping("/{deckId}/cards/difficult")
    public ResponseEntity<List<CardResponse>> getDifficultCards(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/{}/cards/difficult - userId: {}", deckId, user.getId());

        List<CardResponse> difficultCards = cardService.getDifficultCards(user, deckId);

        return ResponseEntity.ok(difficultCards);
    }

    /**
     * Count difficult cards in a deck
     * GET /api/v1/decks/{deckId}/cards/difficult/count
     *
     * @param userDetails Authenticated user from JWT token
     * @param deckId Deck ID
     * @return Count of difficult cards
     */
    @GetMapping("/{deckId}/cards/difficult/count")
    public ResponseEntity<Long> countDifficultCards(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID deckId) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/decks/{}/cards/difficult/count - userId: {}", deckId, user.getId());

        long count = cardService.countDifficultCards(user, deckId);

        return ResponseEntity.ok(count);
    }

    /**
     * Update deck last viewed timestamp
     * POST /api/v1/decks/{id}/view
     */
    @PostMapping("/{id}/view")
    public ResponseEntity<Void> updateDeckLastViewed(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/decks/{}/view - Updating last viewed: user={}", id, user.getId());
        
        deckService.updateLastViewed(user, id);
        
        return ResponseEntity.ok().build();
    }

    /**
     * Get current authenticated user from UserDetails
     *
     * @param userDetails Authenticated user details from JWT
     * @return User entity
     * @throws UnauthorizedException if user not found
     */
    private User getCurrentUser(UserDetails userDetails) {
        return userDetailsService.getUserByEmail(userDetails.getUsername());
    }
}
