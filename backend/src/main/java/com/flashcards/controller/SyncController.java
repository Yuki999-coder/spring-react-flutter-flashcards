package com.flashcards.controller;

import com.flashcards.dto.request.SyncPushRequest;
import com.flashcards.dto.response.SyncDataResponse;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.User;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.SyncService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Sync Controller
 * REST API endpoints for mobile offline-first synchronization
 * Base URL: /api/v1/sync
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Pull data from server (Download changes)
     * GET /api/v1/sync
     *
     * Returns all entities (Decks, Cards, StudyLogs, CardProgress, Folders) 
     * that were created or updated after lastSyncTime
     *
     * @param userDetails Authenticated user from JWT token
     * @param lastSyncTime Optional timestamp of last successful sync (format: yyyy-MM-dd'T'HH:mm:ss)
     *                     If null, returns all data (first sync)
     * @return SyncDataResponse containing changed entities and current server time
     * 
     * @apiNote Example: GET /api/v1/sync?lastSyncTime=2024-01-15T10:30:00
     */
    @GetMapping
    public ResponseEntity<SyncDataResponse> pullData(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) 
            Instant lastSyncTime) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/sync - Pull data: userId={}, lastSyncTime={}", 
            user.getId(), lastSyncTime);

        SyncDataResponse response = syncService.pullData(user.getId(), lastSyncTime);

        log.info("Pull sync completed: {} folders, {} decks, {} cards, {} studyLogs, {} cardProgress",
            response.getFolders() != null ? response.getFolders().size() : 0,
            response.getDecks() != null ? response.getDecks().size() : 0,
            response.getCards() != null ? response.getCards().size() : 0,
            response.getStudyLogs() != null ? response.getStudyLogs().size() : 0,
            response.getCardProgress() != null ? response.getCardProgress().size() : 0);

        return ResponseEntity.ok(response);
    }

    /**
     * Push data to server (Upload changes)
     * POST /api/v1/sync
     *
     * Receives changes from mobile client and saves to database.
     * Supports creating new entities and updating existing ones.
     *
     * @param userDetails Authenticated user from JWT token
     * @param request Sync push request containing changed entities
     * @return SyncDataResponse with current server time
     * 
     * @apiNote Request body example:
     * {
     *   "decks": [
     *     {
     *       "id": null,  // null for new deck
     *       "title": "New Deck from Mobile",
     *       "description": "Created offline",
     *       "folderId": 1
     *     }
     *   ],
     *   "cards": [
     *     {
     *       "id": null,
     *       "deckId": 1,
     *       "term": "Hello",
     *       "definition": "A greeting",
     *       "position": 0
     *     }
     *   ],
     *   "studyLogs": [
     *     {
     *       "id": null,
     *       "cardId": 5,
     *       "grade": "GOOD",
     *       "action": "REVIEW"
     *     }
     *   ]
     * }
     */
    @PostMapping
    public ResponseEntity<SyncDataResponse> pushData(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SyncPushRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/sync - Push data: userId={}", user.getId());
        
        log.debug("Push request: {} folders, {} decks, {} cards, {} studyLogs, {} cardProgress",
            request.getFolders() != null ? request.getFolders().size() : 0,
            request.getDecks() != null ? request.getDecks().size() : 0,
            request.getCards() != null ? request.getCards().size() : 0,
            request.getStudyLogs() != null ? request.getStudyLogs().size() : 0,
            request.getCardProgress() != null ? request.getCardProgress().size() : 0);

        SyncDataResponse response = syncService.pushData(user.getId(), request);

        log.info("Push sync completed successfully");

        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    /**
     * Get current server time
     * GET /api/v1/sync/time
     *
     * Useful for mobile clients to synchronize their clocks with server
     *
     * @return Current server timestamp
     */
    @GetMapping("/time")
    public ResponseEntity<LocalDateTime> getServerTime() {
        LocalDateTime serverTime = LocalDateTime.now();
        log.debug("GET /api/v1/sync/time - serverTime={}", serverTime);
        return ResponseEntity.ok(serverTime);
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
