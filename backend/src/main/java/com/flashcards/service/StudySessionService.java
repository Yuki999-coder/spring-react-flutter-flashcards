package com.flashcards.service;

import com.flashcards.dto.response.ModeStatisticsDetail;
import com.flashcards.model.entity.StudySession;
import com.flashcards.model.entity.User;
import com.flashcards.model.enums.StudyMode;
import com.flashcards.repository.StudySessionRepository;
import com.flashcards.repository.TestResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing study sessions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final TestResultRepository testResultRepository;

    /**
     * Create a new study session
     *
     * @param user Authenticated user
     * @param deckId Deck ID (optional)
     * @param mode Study mode
     * @param startTime Start time
     * @param endTime End time
     * @param cardsStudied Number of cards studied (optional)
     * @return Created study session
     */
    @Transactional
    public StudySession createStudySession(User user, UUID deckId, StudyMode mode, 
                                          Instant startTime, Instant endTime, 
                                          Integer cardsStudied) {
        log.info("Creating study session: userId={}, mode={}, duration={}s", 
                user.getId(), mode, java.time.Duration.between(startTime, endTime).getSeconds());

        StudySession session = StudySession.builder()
                .userId(user.getId())
                .deckId(deckId)
                .mode(mode)
                .startTime(startTime)
                .endTime(endTime)
                .cardsStudied(cardsStudied)
                .build();

        return studySessionRepository.save(session);
    }

    /**
     * Get all study sessions for a user
     */
    public List<StudySession> getUserStudySessions(UUID userId) {
        log.debug("Getting study sessions for user: {}", userId);
        return studySessionRepository.findByUserIdOrderByStartTimeDesc(userId);
    }

    /**
     * Get total study time statistics for a user
     * Returns a map with total time and time per mode (in seconds)
     */
    public Map<String, Long> getStudyTimeStatistics(UUID userId) {
        log.debug("Getting study time statistics for user: {}", userId);

        Map<String, Long> stats = new HashMap<>();
        
        // Total time across all modes
        Long totalTime = studySessionRepository.getTotalStudyTimeByUserId(userId);
        stats.put("total", totalTime);

        // Time per mode
        for (StudyMode mode : StudyMode.values()) {
            Long modeTime = studySessionRepository.getTotalStudyTimeByUserIdAndMode(userId, mode);
            stats.put(mode.name().toLowerCase(), modeTime);
        }

        return stats;
    }

    /**
     * Get study sessions within a date range
     */
    public List<StudySession> getStudySessionsByDateRange(UUID userId, Instant startDate, Instant endDate) {
        log.debug("Getting study sessions for user {} from {} to {}", userId, startDate, endDate);
        return studySessionRepository.findByUserIdAndDateRange(userId, startDate, endDate);
    }

    /**
     * Delete all study sessions for a user
     */
    @Transactional
    public void deleteUserStudySessions(UUID userId) {
        log.info("Deleting all study sessions for user: {}", userId);
        studySessionRepository.deleteByUserId(userId);
    }

    /**
     * Get study time statistics by deck
     */
    public Map<String, Long> getStudyTimeStatisticsByDeck(UUID userId, UUID deckId) {
        log.debug("Getting study time statistics for user: {} and deck: {}", userId, deckId);
        
        Map<String, Long> statistics = new HashMap<>();
        
        // Total time for this deck
        Long totalTime = studySessionRepository.getTotalStudyTimeByDeck(userId, deckId);
        statistics.put("total", totalTime != null ? totalTime : 0L);
        
        // Time by mode for this deck
        for (StudyMode mode : StudyMode.values()) {
            Long modeTime = studySessionRepository.getStudyTimeByModeAndDeck(userId, mode, deckId);
            statistics.put(mode.name().toLowerCase(), modeTime != null ? modeTime : 0L);
        }
        
        return statistics;
    }

    /**
     * Get detailed statistics for each mode
     */
    public Map<String, ModeStatisticsDetail> getModeDetails(UUID userId, UUID deckId) {
        log.debug("Getting mode details for user: {} and deck: {}", userId, deckId);
        
        Map<String, ModeStatisticsDetail> details = new HashMap<>();
        
        for (StudyMode mode : StudyMode.values()) {
            ModeStatisticsDetail detail = getModeDetail(userId, deckId, mode);
            details.put(mode.name().toLowerCase(), detail);
        }
        
        return details;
    }

    /**
     * Get detailed statistics for a specific mode
     */
    private ModeStatisticsDetail getModeDetail(UUID userId, UUID deckId, StudyMode mode) {
        // Get sessions for this mode
        List<StudySession> sessions = deckId != null 
            ? studySessionRepository.findByUserIdAndModeAndDeckIdOrderByStartTimeDesc(userId, mode, deckId)
            : studySessionRepository.findByUserIdAndModeOrderByStartTimeDesc(userId, mode);

        if (sessions.isEmpty()) {
            return ModeStatisticsDetail.builder()
                .mode(mode.name().toLowerCase())
                .timeSpentSeconds(0L)
                .timeSpentFormatted("0s")
                .cardsSeen(0)
                .lastActive(null)
                .lastActiveFormatted("Never")
                .isCompleted(false)
                .build();
        }

        // Calculate total time
        Long totalSeconds = sessions.stream()
            .mapToLong(StudySession::getDurationSeconds)
            .sum();

        // Calculate total cards seen
        Integer totalCards = sessions.stream()
            .mapToInt(s -> s.getCardsStudied() != null ? s.getCardsStudied() : 0)
            .sum();

        // Get last session
        StudySession lastSession = sessions.get(0); // Already ordered by startTime DESC

        // Calculate average grade for test mode
        Double averageGrade = null;
        Integer testHistory = null;
        Instant lastSubmission = null;
        
        if (mode == StudyMode.TEST) {
            // Get test results for this deck
            averageGrade = testResultRepository.getAverageScoreByUserIdAndDeckId(userId, deckId);
            testHistory = testResultRepository.countByUserIdAndDeckId(userId, deckId).intValue();
            lastSubmission = lastSession.getEndTime();
        }

        return ModeStatisticsDetail.builder()
            .mode(mode.name().toLowerCase())
            .timeSpentSeconds(totalSeconds)
            .timeSpentFormatted(formatDuration(totalSeconds))
            .cardsSeen(totalCards)
            .lastActive(lastSession.getEndTime())
            .lastActiveFormatted(formatRelativeTime(lastSession.getEndTime()))
            .isCompleted(false) // TODO: Implement completion logic
            .averageGrade(averageGrade)
            .testHistory(testHistory)
            .lastSubmission(lastSubmission)
            .lastSubmissionFormatted(lastSubmission != null ? formatDate(lastSubmission) : null)
            .build();
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

    /**
     * Format relative time (e.g., "2 minutes ago")
     */
    private String formatRelativeTime(Instant instant) {
        if (instant == null) {
            return "Never";
        }

        Duration duration = Duration.between(instant, Instant.now());
        long seconds = duration.getSeconds();

        if (seconds < 60) {
            return seconds + " second" + (seconds != 1 ? "s" : "") + " ago";
        } else if (seconds < 3600) {
            long minutes = seconds / 60;
            return minutes + " minute" + (minutes != 1 ? "s" : "") + " ago";
        } else if (seconds < 86400) {
            long hours = seconds / 3600;
            return hours + " hour" + (hours != 1 ? "s" : "") + " ago";
        } else {
            long days = seconds / 86400;
            return days + " day" + (days != 1 ? "s" : "") + " ago";
        }
    }

    /**
     * Format date (e.g., "Jan 15, 2026")
     */
    private String formatDate(Instant instant) {
        if (instant == null) {
            return null;
        }
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
        return instant.atZone(ZoneId.systemDefault()).format(formatter);
    }
}
