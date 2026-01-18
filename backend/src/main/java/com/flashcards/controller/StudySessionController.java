package com.flashcards.controller;

import com.flashcards.dto.request.CreateStudySessionRequest;
import com.flashcards.dto.response.StudySessionResponse;
import com.flashcards.dto.response.StudyTimeStatisticsResponse;
import com.flashcards.model.entity.StudySession;
import com.flashcards.model.entity.User;
import com.flashcards.service.StudySessionService;
import com.flashcards.security.CustomUserDetailsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for managing study sessions
 */
@RestController
@RequestMapping("/api/v1/study-sessions")
@RequiredArgsConstructor
@Slf4j
public class StudySessionController {

    private final StudySessionService studySessionService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Create a new study session
     */
    @PostMapping
    public ResponseEntity<StudySessionResponse> createStudySession(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateStudySessionRequest request) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("POST /api/v1/study-sessions - userId: {}, mode: {}", user.getId(), request.getMode());

        StudySession session = studySessionService.createStudySession(
                user,
                request.getDeckId() != null ? UUID.fromString(request.getDeckId()) : null,
                request.getMode(),
                request.getStartTime(),
                request.getEndTime(),
                request.getCardsStudied()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(session));
    }

    /**
     * Get all study sessions for the authenticated user
     */
    @GetMapping
    public ResponseEntity<List<StudySessionResponse>> getUserStudySessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("GET /api/v1/study-sessions - userId: {}", user.getId());

        List<StudySession> sessions = studySessionService.getUserStudySessions(user.getId());
        List<StudySessionResponse> responses = sessions.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Get study time statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<StudyTimeStatisticsResponse> getStudyTimeStatistics(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("GET /api/v1/study-sessions/statistics - userId: {}", user.getId());

        Map<String, Long> stats = studySessionService.getStudyTimeStatistics(user.getId());
        
        // Format times
        Map<String, String> formattedTimes = new HashMap<>();
        stats.forEach((key, seconds) -> {
            formattedTimes.put(key, formatDuration(seconds));
        });

        StudyTimeStatisticsResponse response = StudyTimeStatisticsResponse.builder()
                .totalSeconds(stats.get("total"))
                .timeByMode(stats)
                .totalFormatted(formattedTimes.get("total"))
                .timeByModeFormatted(formattedTimes)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Delete all study sessions for the authenticated user
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteUserStudySessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("DELETE /api/v1/study-sessions - userId: {}", user.getId());

        studySessionService.deleteUserStudySessions(user.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Convert StudySession entity to response DTO
     */
    private StudySessionResponse toResponse(StudySession session) {
        return StudySessionResponse.builder()
                .id(session.getId().toString())
                .userId(session.getUserId().toString())
                .deckId(session.getDeckId() != null ? session.getDeckId().toString() : null)
                .mode(session.getMode())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .durationSeconds(session.getDurationSeconds())
                .cardsStudied(session.getCardsStudied())
                .createdAt(session.getCreatedAt())
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
}
