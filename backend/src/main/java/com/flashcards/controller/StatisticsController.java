package com.flashcards.controller;

import com.flashcards.dto.response.MasteryLevelStatistics;
import com.flashcards.dto.response.ModeStatisticsDetail;
import com.flashcards.dto.response.StatisticsSummaryResponse;
import com.flashcards.dto.response.StudyTimeStatisticsResponse;
import com.flashcards.dto.statistics.StatisticsSummaryDTO;
import com.flashcards.model.entity.User;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.StatisticsService;
import com.flashcards.service.StudySessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    
    private final StatisticsService statisticsService;
    private final StudySessionService studySessionService;
    private final CustomUserDetailsService userDetailsService;
    
    @GetMapping("/summary")
    public ResponseEntity<StatisticsSummaryDTO> getStatisticsSummary(Authentication authentication) {
        String userEmail = authentication.getName();
        log.info("GET /api/v1/statistics/summary - User: {}", userEmail);
        
        StatisticsSummaryDTO summary = statisticsService.getStatisticsSummary(userEmail);
        return ResponseEntity.ok(summary);
    }

    /**
     * Get mastery level statistics
     */
    @GetMapping("/mastery-levels")
    public ResponseEntity<MasteryLevelStatistics> getMasteryLevels(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("GET /api/v1/statistics/mastery-levels - userId: {}", user.getId());

        MasteryLevelStatistics stats = statisticsService.getMasteryLevelStatistics(user.getId());
        return ResponseEntity.ok(stats);
    }

    /**
     * Get enhanced statistics summary with mastery levels and study time
     * Optional deckId parameter to filter statistics for a specific deck
     */
    @GetMapping("/summary/enhanced")
    public ResponseEntity<StatisticsSummaryResponse> getEnhancedSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) UUID deckId) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("GET /api/v1/statistics/summary/enhanced - userId: {}, deckId: {}", user.getId(), deckId);

        // Get mastery levels (filtered by deckId if provided)
        MasteryLevelStatistics masteryLevels = deckId != null
                ? statisticsService.getMasteryLevelStatisticsByDeck(user.getId(), deckId)
                : statisticsService.getMasteryLevelStatistics(user.getId());

        // Get study time statistics (filtered by deckId if provided)
        Map<String, Long> timeStats = deckId != null
                ? studySessionService.getStudyTimeStatisticsByDeck(user.getId(), deckId)
                : studySessionService.getStudyTimeStatistics(user.getId());
        Map<String, String> formattedTimes = new HashMap<>();
        timeStats.forEach((key, seconds) -> {
            formattedTimes.put(key, formatDuration(seconds));
        });

        // Get mode details (filtered by deckId if provided)
        Map<String, ModeStatisticsDetail> modeDetails = studySessionService.getModeDetails(user.getId(), deckId);

        StudyTimeStatisticsResponse studyTime = StudyTimeStatisticsResponse.builder()
                .totalSeconds(timeStats.get("total"))
                .timeByMode(timeStats)
                .totalFormatted(formattedTimes.get("total"))
                .timeByModeFormatted(formattedTimes)
                .modeDetails(modeDetails)
                .build();

        // Build response
        StatisticsSummaryResponse response = StatisticsSummaryResponse.builder()
                .totalCards(masteryLevels.getTotal())
                .masteryLevels(masteryLevels)
                .studyTime(studyTime)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Format duration in seconds to human-readable string
     */
    private String formatDuration(Long seconds) {
        if (seconds == null || seconds == 0) {
            return "0s";
        }

        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;

        StringBuilder formatted = new StringBuilder();
        if (hours > 0) {
            formatted.append(hours).append("h ");
        }
        if (minutes > 0) {
            formatted.append(minutes).append("m ");
        }
        if (secs > 0 || formatted.length() == 0) {
            formatted.append(secs).append("s");
        }

        return formatted.toString().trim();
    }
}
