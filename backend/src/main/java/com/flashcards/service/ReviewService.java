package com.flashcards.service;

import com.flashcards.exception.CardNotFoundException;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.Card;
import com.flashcards.model.entity.CardProgress;
import com.flashcards.model.entity.Deck;
import com.flashcards.model.entity.StudyLog;
import com.flashcards.model.entity.User;
import com.flashcards.model.enums.Grade;
import com.flashcards.model.enums.LearningState;
import com.flashcards.repository.CardProgressRepository;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.DeckRepository;
import com.flashcards.repository.StudyLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Review Service
 * Handles flashcard review logic with SM-2 Spaced Repetition Algorithm
 * 
 * SM-2 Algorithm:
 * - Adjusts review intervals based on user performance
 * - Ease Factor (EF) determines how quickly intervals grow
 * - Failed cards (AGAIN) reset to short intervals
 * - Successful reviews increase intervals exponentially
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final CardRepository cardRepository;
    private final DeckRepository deckRepository;
    private final CardProgressRepository cardProgressRepository;
    private final StudyLogRepository studyLogRepository;

    // SM-2 Algorithm Constants
    private static final float MIN_EASE_FACTOR = 1.3f;
    private static final int MIN_INTERVAL = 1;

    /**
     * Review a card and update its progress using SM-2 algorithm
     * 
     * @param user Current user performing the review
     * @param cardId Card being reviewed
     * @param grade User's performance grade (AGAIN, HARD, GOOD, EASY)
     * @return Updated CardProgress
     * @throws CardNotFoundException if card is not found or deleted
     * @throws UnauthorizedException if user doesn't own the card
     */
    @Transactional
    public CardProgress reviewCard(User user, UUID cardId, Grade grade) {
        log.debug("Reviewing card {} by user {} with grade {}", cardId, user.getId(), grade);

        // Step 1: Validate card existence and ownership
        Card card = validateCardAndOwnership(user.getId(), cardId);

        // Step 2: Get or create CardProgress
        CardProgress progress = getOrCreateCardProgress(user.getId(), cardId);

        // Step 3: Record current time for study log
        Instant reviewTime = Instant.now();
        int currentInterval = progress.getInterval();
        int currentRepetitions = progress.getRepetitions();
        float currentEaseFactor = progress.getEaseFactor();

        // Step 4: Apply SM-2 Algorithm based on grade
        applySmAlgorithm(progress, grade, currentInterval, currentRepetitions, currentEaseFactor);

        // Step 5: Set next review date
        progress.setNextReview(reviewTime.plus(progress.getInterval(), ChronoUnit.DAYS));
        progress.setUserId(user.getId());
        progress.setCardId(cardId);

        // Step 6: Save CardProgress
        CardProgress savedProgress = cardProgressRepository.save(progress);
        log.info("Updated card progress: cardId={}, state={}, interval={}, easeFactor={}, nextReview={}", 
                 cardId, savedProgress.getLearningState(), savedProgress.getInterval(), 
                 savedProgress.getEaseFactor(), savedProgress.getNextReview());

        // Step 7: Save StudyLog
        saveStudyLog(user.getId(), cardId, grade, reviewTime);

        return savedProgress;
    }

    /**
     * Validate that card exists, is not deleted, and belongs to the user
     */
    private Card validateCardAndOwnership(UUID userId, UUID cardId) {
        // Find card with ownership verification (joins to Deck)
        Card card = cardRepository.findByIdAndDeckUserId(cardId, userId)
                .orElseThrow(() -> {
                    log.warn("Card not found or unauthorized access: cardId={}, userId={}", cardId, userId);
                    return new CardNotFoundException("Card not found");
                });

        // Double-check soft delete status
        if (card.isDeleted()) {
            log.warn("Attempted to review deleted card: cardId={}", cardId);
            throw new CardNotFoundException("Card not found");
        }

        // Verify deck is not deleted
        Deck deck = deckRepository.findById(card.getDeckId())
                .orElseThrow(() -> new CardNotFoundException("Card not found"));

        if (deck.isDeleted()) {
            log.warn("Attempted to review card in deleted deck: cardId={}, deckId={}", cardId, deck.getId());
            throw new CardNotFoundException("Card not found");
        }

        // Verify deck ownership
        if (!deck.getUserId().equals(userId)) {
            log.warn("Unauthorized access to card: cardId={}, userId={}, deckOwnerId={}", 
                     cardId, userId, deck.getUserId());
            throw new UnauthorizedException();
        }

        return card;
    }

    /**
     * Get existing CardProgress or create new one with default values
     */
    private CardProgress getOrCreateCardProgress(UUID userId, UUID cardId) {
        return cardProgressRepository.findByUserIdAndCardId(userId, cardId)
                .orElseGet(() -> {
                    log.info("Creating new CardProgress for user {} and card {}", userId, cardId);
                    return CardProgress.builder()
                            .userId(userId)
                            .cardId(cardId)
                            .learningState(LearningState.NEW)
                            .interval(0)
                            .repetitions(0)
                            .easeFactor(2.5f)
                            .nextReview(null)
                            .build();
                });
    }

    /**
     * Apply SM-2 Algorithm to update card progress based on grade
     * 
     * SM-2 Algorithm Rules:
     * - AGAIN (0): Failed, reset repetitions, short interval, decrease EF
     * - HARD (2): Barely passed, minimal interval increase, small EF decrease
     * - GOOD (3): Normal success, interval grows by EF
     * - EASY (4): Perfect recall, interval grows by EF * 1.3, increase EF
     */
    private void applySmAlgorithm(CardProgress progress, Grade grade, 
                                  int currentInterval, int currentRepetitions, 
                                  float currentEaseFactor) {
        
        int newInterval;
        int newRepetitions;
        float newEaseFactor;
        LearningState newState;

        switch (grade) {
            case AGAIN:
                // Complete failure - reset to relearning
                newRepetitions = 0;
                newInterval = MIN_INTERVAL; // 1 day
                newEaseFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2f);
                newState = LearningState.RELEARNING;
                log.debug("AGAIN: Reset card - interval={}, easeFactor={}", newInterval, newEaseFactor);
                break;

            case HARD:
                // Difficult but correct - minimal increase
                newRepetitions = currentRepetitions + 1;
                newInterval = Math.max(MIN_INTERVAL, (int) Math.ceil(currentInterval * 1.2));
                newEaseFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15f);
                newState = LearningState.REVIEWING;
                log.debug("HARD: Slow growth - interval={}, easeFactor={}", newInterval, newEaseFactor);
                break;

            case GOOD:
                // Normal success - standard SM-2 growth
                newRepetitions = currentRepetitions + 1;
                if (currentInterval == 0) {
                    newInterval = MIN_INTERVAL;
                } else {
                    newInterval = Math.max(MIN_INTERVAL, (int) Math.ceil(currentInterval * currentEaseFactor));
                }
                newEaseFactor = currentEaseFactor; // Keep same
                newState = LearningState.REVIEWING;
                log.debug("GOOD: Normal growth - interval={}, easeFactor={}", newInterval, newEaseFactor);
                break;

            case EASY:
                // Perfect recall - accelerated growth
                newRepetitions = currentRepetitions + 1;
                if (currentInterval == 0) {
                    newInterval = MIN_INTERVAL * 2;
                } else {
                    newInterval = Math.max(MIN_INTERVAL, (int) Math.ceil(currentInterval * currentEaseFactor * 1.3));
                }
                newEaseFactor = currentEaseFactor + 0.15f;
                newState = LearningState.REVIEWING;
                log.debug("EASY: Fast growth - interval={}, easeFactor={}", newInterval, newEaseFactor);
                break;

            default:
                throw new IllegalArgumentException("Invalid grade: " + grade);
        }

        // Update progress object
        progress.setRepetitions(newRepetitions);
        progress.setInterval(newInterval);
        progress.setEaseFactor(newEaseFactor);
        progress.setLearningState(newState);
    }

    /**
     * Save study session to log for analytics
     */
    private void saveStudyLog(UUID userId, UUID cardId, Grade grade, Instant reviewTime) {
        StudyLog log = StudyLog.builder()
                .userId(userId)
                .cardId(cardId)
                .grade(grade)
                .action("REVIEW") // Statistics tracking
                .timeTakenMs(null) // Can be set by caller if available
                .reviewedAt(reviewTime)
                .build();

        studyLogRepository.save(log);
        this.log.debug("Saved study log: userId={}, cardId={}, grade={}, action=REVIEW", userId, cardId, grade);
    }

    /**
     * Get due cards count for a user
     */
    public long getDueCardsCount(UUID userId) {
        return cardProgressRepository.findDueCards(userId).size();
    }

    /**
     * Get new cards count for a user
     */
    public long getNewCardsCount(UUID userId) {
        return cardProgressRepository.countNewCards(userId);
    }

    /**
     * Get reviewing cards count for a user
     */
    public long getReviewingCardsCount(UUID userId) {
        return cardProgressRepository.countReviewingCards(userId);
    }
}
