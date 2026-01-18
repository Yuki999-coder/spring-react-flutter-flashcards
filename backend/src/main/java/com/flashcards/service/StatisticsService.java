package com.flashcards.service;

import com.flashcards.dto.response.MasteryLevelStatistics;
import com.flashcards.dto.statistics.StatisticsSummaryDTO;
import com.flashcards.model.entity.Card;
import com.flashcards.model.entity.CardProgress;
import com.flashcards.model.entity.StudyLog;
import com.flashcards.model.entity.User;
import com.flashcards.model.enums.LearningState;
import com.flashcards.repository.CardProgressRepository;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.StudyLogRepository;
import com.flashcards.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatisticsService {
    
    private final StudyLogRepository studyLogRepository;
    private final CardRepository cardRepository;
    private final CardProgressRepository cardProgressRepository;
    private final UserRepository userRepository;
    
    /**
     * Log a study action
     */
    public void logStudyAction(UUID userId, UUID cardId, String action) {
        StudyLog studyLog = StudyLog.builder()
                .userId(userId)
                .cardId(cardId)
                .action(action)
                .build();
        studyLogRepository.save(studyLog);
        log.info("Logged study action: userId={}, cardId={}, action={}", userId, cardId, action);
    }
    
    /**
     * Get statistics summary for user
     */
    public StatisticsSummaryDTO getStatisticsSummary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        UUID userId = user.getId();
        
        log.info("Getting statistics summary for user: {}", userId);
        
        // Calculate streak
        Integer streak = calculateStreak(userId);
        
        // Count total cards learned
        Long totalCardsLearned = studyLogRepository.countDistinctCardsByUserId(userId);
        
        // Count due cards (cards that need review now)
        Long dueCardsCount = cardProgressRepository.countDueCards(userId);
        
        // Generate heatmap data (last 365 days)
        Map<String, Integer> heatmapData = generateHeatmapData(userId);
        
        // Generate pie chart data (card status distribution)
        StatisticsSummaryDTO.PieChartDataDTO pieChartData = generatePieChartData(userId);
        
        return StatisticsSummaryDTO.builder()
                .streak(streak)
                .totalCardsLearned(totalCardsLearned != null ? totalCardsLearned : 0L)
                .dueCardsCount(dueCardsCount)
                .heatmapData(heatmapData)
                .pieChartData(pieChartData)
                .build();
    }
    
    /**
     * Calculate current study streak (consecutive days)
     */
    private Integer calculateStreak(UUID userId) {
        List<StudyLog> studyLogs = studyLogRepository.findAllByUserIdOrderByReviewedAtDesc(userId);
        
        if (studyLogs == null || studyLogs.isEmpty()) {
            return 0;
        }
        
        // Extract unique dates and sort descending
        List<LocalDate> studyDates = studyLogs.stream()
                .map(log -> log.getReviewedAt().atZone(ZoneId.systemDefault()).toLocalDate())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
        
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        
        // Check if user studied today or yesterday (streak is active)
        LocalDate mostRecentDate = studyDates.get(0);
        if (!mostRecentDate.equals(today) && !mostRecentDate.equals(yesterday)) {
            return 0; // Streak broken
        }
        
        // Count consecutive days
        int streak = 1;
        LocalDate expectedDate = mostRecentDate.minusDays(1);
        
        for (int i = 1; i < studyDates.size(); i++) {
            LocalDate currentDate = studyDates.get(i);
            
            if (currentDate.equals(expectedDate)) {
                streak++;
                expectedDate = expectedDate.minusDays(1);
            } else {
                break; // Streak broken
            }
        }
        
        log.info("Calculated streak for user {}: {} days", userId, streak);
        return streak;
    }
    
    /**
     * Generate heatmap data for last 365 days
     */
    private Map<String, Integer> generateHeatmapData(UUID userId) {
        Instant startDate = Instant.now().minus(365, java.time.temporal.ChronoUnit.DAYS);
        List<StudyLog> logs = studyLogRepository.findByUserIdAndReviewedAtAfter(userId, startDate);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        // Group by date and count
        Map<String, Integer> heatmap = logs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getReviewedAt().atZone(ZoneId.systemDefault()).toLocalDate().format(formatter),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
        
        // Fill missing dates with 0
        Map<String, Integer> completeHeatmap = new LinkedHashMap<>();
        LocalDate currentDate = LocalDate.now().minusDays(365);
        LocalDate endDate = LocalDate.now();
        
        while (!currentDate.isAfter(endDate)) {
            String dateKey = currentDate.format(formatter);
            completeHeatmap.put(dateKey, heatmap.getOrDefault(dateKey, 0));
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("Generated heatmap data for user {}: {} days with data", userId, heatmap.size());
        return completeHeatmap;
    }
    
    /**
     * Generate pie chart data (card status distribution)
     * TODO: Update when Card entity has status field (SM-2 algorithm)
     */
    private StatisticsSummaryDTO.PieChartDataDTO generatePieChartData(UUID userId) {
        List<Card> userCards = cardRepository.findAllByDeck_User_Id(userId);
        
        // Get cards that have been studied (have study logs)
        long totalCards = userCards.size();
        long studiedCards = studyLogRepository.countDistinctCardsByUserId(userId) != null 
            ? studyLogRepository.countDistinctCardsByUserId(userId) 
            : 0L;
        long newCards = totalCards - studiedCards;
        
        // For now, distribute studied cards equally between learning and reviewing
        // This will be updated when SM-2 algorithm is implemented
        long learningCards = studiedCards / 2;
        long reviewingCards = studiedCards - learningCards;
        
        log.info("Generated pie chart data for user {}: NEW={}, LEARNING={}, REVIEWING={}, RELEARNING={}", 
                userId, newCards, learningCards, reviewingCards, 0);
        
        return StatisticsSummaryDTO.PieChartDataDTO.builder()
                .newCards(newCards)
                .learningCards(learningCards)
                .reviewingCards(reviewingCards)
                .relearningCards(0L)
                .build();
    }

    /**
     * Get mastery level statistics for a user
     * Categorizes cards into: New, Still Learning, Almost Done, Mastered
     */
    public MasteryLevelStatistics getMasteryLevelStatistics(UUID userId) {
        log.info("Getting mastery level statistics for user: {}", userId);

        // Get all cards for this user through their decks
        List<Card> allCards = cardRepository.findAllByDeck_User_Id(userId);

        int newCards = 0;
        int stillLearning = 0;
        int almostDone = 0;
        int mastered = 0;

        for (Card card : allCards) {
            // Get card progress for this user
            Optional<CardProgress> progressOpt = cardProgressRepository
                    .findByUserIdAndCardId(userId, card.getId());

            if (progressOpt.isEmpty()) {
                // No progress = new card
                newCards++;
            } else {
                CardProgress progress = progressOpt.get();
                LearningState state = progress.getLearningState();
                Integer interval = progress.getInterval();

                if (state == LearningState.LEARNING_MCQ || state == LearningState.LEARNING_TYPING || state == LearningState.RELEARNING) {
                    // Still learning
                    stillLearning++;
                } else if (state == LearningState.REVIEWING) {
                    // Reviewing cards are categorized by interval
                    if (interval != null && interval >= 21) {
                        // Mastered (21+ days interval)
                        mastered++;
                    } else if (interval != null && interval >= 3) {
                        // Almost done (3-20 days interval)
                        almostDone++;
                    } else {
                        // Still learning (< 3 days interval)
                        stillLearning++;
                    }
                } else {
                    // Default for other states
                    newCards++;
                }
            }
        }

        int total = newCards + stillLearning + almostDone + mastered;

        // Calculate percentages
        double newPercentage = total > 0 ? (newCards * 100.0 / total) : 0.0;
        double stillLearningPercentage = total > 0 ? (stillLearning * 100.0 / total) : 0.0;
        double almostDonePercentage = total > 0 ? (almostDone * 100.0 / total) : 0.0;
        double masteredPercentage = total > 0 ? (mastered * 100.0 / total) : 0.0;

        log.info("Mastery levels for user {}: New={}, Learning={}, AlmostDone={}, Mastered={}", 
                userId, newCards, stillLearning, almostDone, mastered);

        return MasteryLevelStatistics.builder()
                .newCards(newCards)
                .stillLearning(stillLearning)
                .almostDone(almostDone)
                .mastered(mastered)
                .total(total)
                .newCardsPercentage(newPercentage)
                .stillLearningPercentage(stillLearningPercentage)
                .almostDonePercentage(almostDonePercentage)
                .masteredPercentage(masteredPercentage)
                .build();
    }

    /**
     * Get mastery level statistics for a specific deck
     */
    public MasteryLevelStatistics getMasteryLevelStatisticsByDeck(UUID userId, UUID deckId) {
        log.info("Getting mastery level statistics for user: {} and deck: {}", userId, deckId);

        // Get all cards for this deck (already filters deleted cards via @Where clause)
        List<Card> allCards = cardRepository.findAllByDeckIdOrderByPositionAsc(deckId);

        int newCards = 0;
        int stillLearning = 0;
        int almostDone = 0;
        int mastered = 0;

        for (Card card : allCards) {
            // Get card progress for this user
            Optional<CardProgress> progressOpt = cardProgressRepository
                    .findByUserIdAndCardId(userId, card.getId());

            if (progressOpt.isEmpty()) {
                newCards++;
            } else {
                CardProgress progress = progressOpt.get();
                LearningState state = progress.getLearningState();
                Integer interval = progress.getInterval();

                if (state == LearningState.LEARNING_MCQ || state == LearningState.LEARNING_TYPING || state == LearningState.RELEARNING) {
                    stillLearning++;
                } else if (state == LearningState.REVIEWING) {
                    if (interval != null && interval >= 21) {
                        mastered++;
                    } else if (interval != null && interval >= 3) {
                        // Almost done (3-20 days interval)
                        almostDone++;
                    } else {
                        // Still learning (< 3 days interval)
                        stillLearning++;
                    }
                } else {
                    newCards++;
                }
            }
        }

        int total = newCards + stillLearning + almostDone + mastered;

        // Calculate percentages
        double newPercentage = total > 0 ? (newCards * 100.0 / total) : 0.0;
        double stillLearningPercentage = total > 0 ? (stillLearning * 100.0 / total) : 0.0;
        double almostDonePercentage = total > 0 ? (almostDone * 100.0 / total) : 0.0;
        double masteredPercentage = total > 0 ? (mastered * 100.0 / total) : 0.0;

        log.info("Mastery levels for user {} deck {}: New={}, Learning={}, AlmostDone={}, Mastered={}", 
                userId, deckId, newCards, stillLearning, almostDone, mastered);

        return MasteryLevelStatistics.builder()
                .newCards(newCards)
                .stillLearning(stillLearning)
                .almostDone(almostDone)
                .mastered(mastered)
                .total(total)
                .newCardsPercentage(newPercentage)
                .stillLearningPercentage(stillLearningPercentage)
                .almostDonePercentage(almostDonePercentage)
                .masteredPercentage(masteredPercentage)
                .build();
    }
}
