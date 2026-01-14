package com.flashcards.controller;

import com.flashcards.dto.request.ReviewRequest;
import com.flashcards.dto.response.CardResponse;
import com.flashcards.dto.response.ReviewResponse;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.Card;
import com.flashcards.model.entity.CardProgress;
import com.flashcards.model.entity.User;
import com.flashcards.repository.CardProgressRepository;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.UserRepository;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.CardService;
import com.flashcards.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Review Controller
 * REST API endpoints for spaced repetition review system
 * Base URL: /api/v1
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final CardService cardService;
    private final CardProgressRepository cardProgressRepository;
    private final UserRepository userRepository;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Get due cards for review
     * GET /api/v1/reviews/due
     *
     * Returns all cards that need to be reviewed now
     * (nextReview <= current time or null)
     *
     * @param userDetails Authenticated user from JWT token
     * @return List of due card progress records
     */
    @GetMapping("/reviews/due")
    public ResponseEntity<List<ReviewResponse>> getDueCards(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/reviews/due - userId: {}", user.getId());
        
        List<CardProgress> dueCards = cardProgressRepository.findDueCards(user.getId());
        
        List<ReviewResponse> response = dueCards.stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());

        log.info("Found {} due cards for user {}", response.size(), user.getId());

        return ResponseEntity.ok(response);
    }

    /**
     * Get due cards count and statistics
     * GET /api/v1/reviews/stats
     *
     * @param userDetails Authenticated user from JWT token
     * @return Statistics about user's review queue
     */
    @GetMapping("/reviews/stats")
    public ResponseEntity<Map<String, Long>> getReviewStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/reviews/stats - userId: {}", user.getId());

        Map<String, Long> stats = new HashMap<>();
        stats.put("dueCount", reviewService.getDueCardsCount(user.getId()));
        stats.put("newCount", reviewService.getNewCardsCount(user.getId()));
        stats.put("reviewingCount", reviewService.getReviewingCardsCount(user.getId()));

        return ResponseEntity.ok(stats);
    }

    /**
     * Review a card (submit answer)
     * POST /api/v1/cards/{cardId}/review
     *
     * Records the user's answer quality and updates the card's
     * spaced repetition schedule using SM-2 algorithm
     *
     * Security: Ensures card ownership through deck verification
     *
     * @param userDetails Authenticated user from JWT token
     * @param cardId Card ID being reviewed
     * @param request Review data (grade: AGAIN/HARD/GOOD/EASY)
     * @return Updated card progress
     */
    @PostMapping("/cards/{cardId}/review")
    public ResponseEntity<ReviewResponse> reviewCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long cardId,
            @Valid @RequestBody ReviewRequest request) {
        
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/cards/{}/review - userId: {}, grade: {}", 
                 cardId, user.getId(), request.getGrade());

        // ReviewService will validate ownership through deck
        CardProgress updatedProgress = reviewService.reviewCard(user, cardId, request.getGrade());

        ReviewResponse response = toReviewResponse(updatedProgress);

        log.info("Card reviewed successfully: cardId={}, newState={}, nextReview={}", 
                 cardId, response.getLearningState(), response.getNextReview());

        return ResponseEntity.ok(response);
    }

    /**
     * Get review progress for a specific card
     * GET /api/v1/cards/{cardId}/progress
     *
     * @param userDetails Authenticated user from JWT token
     * @param cardId Card ID
     * @return Card progress if exists
     */
    @GetMapping("/cards/{cardId}/progress")
    public ResponseEntity<ReviewResponse> getCardProgress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long cardId) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/cards/{}/progress - userId: {}", cardId, user.getId());

        CardProgress progress = cardProgressRepository.findByUserIdAndCardId(user.getId(), cardId)
                .orElseThrow(() -> {
                    log.warn("Card progress not found: cardId={}, userId={}", cardId, user.getId());
                    return new UnauthorizedException("Card progress not found");
                });

        ReviewResponse response = toReviewResponse(progress);

        return ResponseEntity.ok(response);
    }

    /**
     * Get all card progress for user
     * GET /api/v1/reviews/progress
     *
     * @param userDetails Authenticated user from JWT token
     * @return List of all user's card progress
     */
    @GetMapping("/reviews/progress")
    public ResponseEntity<List<ReviewResponse>> getAllProgress(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/reviews/progress - userId: {}", user.getId());

        List<CardProgress> allProgress = cardProgressRepository.findAllByUserId(user.getId());

        List<ReviewResponse> response = allProgress.stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Convert CardProgress entity to ReviewResponse DTO
     */
    private ReviewResponse toReviewResponse(CardProgress progress) {
        CardResponse cardResponse = null;
        
        try {
            // Get user from progress or load by ID
            User user = progress.getUser();
            if (user == null) {
                user = userRepository.findById(progress.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            }
            
            // Fetch card details
            cardResponse = cardService.getCardById(user, progress.getCardId());
        } catch (Exception e) {
            log.error("Failed to fetch card {} for progress {}: {}", 
                progress.getCardId(), progress.getId(), e.getMessage());
            // Create minimal card response if fetch fails
            cardResponse = CardResponse.builder()
                .id(progress.getCardId())
                .term("Card not found")
                .definition("This card may have been deleted")
                .build();
        }
        
        return ReviewResponse.builder()
                .id(progress.getId())
                .userId(progress.getUserId())
                .cardId(progress.getCardId())
                .learningState(progress.getLearningState())
                .nextReview(progress.getNextReview())
                .interval(progress.getInterval())
                .easeFactor(progress.getEaseFactor())
                .repetitions(progress.getRepetitions())
                .createdAt(progress.getCreatedAt())
                .updatedAt(progress.getUpdatedAt())
                .card(cardResponse)
                .build();
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
