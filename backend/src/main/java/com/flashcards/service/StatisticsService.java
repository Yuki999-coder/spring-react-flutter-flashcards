package com.flashcards.service;

import com.flashcards.dto.statistics.StatisticsSummaryDTO;
import com.flashcards.model.entity.Card;
import com.flashcards.model.entity.StudyLog;
import com.flashcards.model.entity.User;
import com.flashcards.repository.CardProgressRepository;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.StudyLogRepository;
import com.flashcards.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
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
    public void logStudyAction(Long userId, Long cardId, String action) {
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
        
        Long userId = user.getId();
        
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
    private Integer calculateStreak(Long userId) {
        List<StudyLog> studyLogs = studyLogRepository.findAllByUserIdOrderByReviewedAtDesc(userId);
        
        if (studyLogs == null || studyLogs.isEmpty()) {
            return 0;
        }
        
        // Extract unique dates and sort descending
        List<LocalDate> studyDates = studyLogs.stream()
                .map(log -> log.getReviewedAt().toLocalDate())
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
    private Map<String, Integer> generateHeatmapData(Long userId) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(365);
        List<StudyLog> logs = studyLogRepository.findByUserIdAndReviewedAtAfter(userId, startDate);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        // Group by date and count
        Map<String, Integer> heatmap = logs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getReviewedAt().toLocalDate().format(formatter),
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
    private StatisticsSummaryDTO.PieChartDataDTO generatePieChartData(Long userId) {
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
}
