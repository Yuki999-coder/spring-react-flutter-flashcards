package com.flashcards.controller;

import com.flashcards.dto.request.CreateTestResultRequest;
import com.flashcards.dto.response.TestResultResponse;
import com.flashcards.model.entity.TestResult;
import com.flashcards.model.entity.User;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.TestResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for managing test results
 */
@RestController
@RequestMapping("/api/v1/test-results")
@RequiredArgsConstructor
@Slf4j
public class TestResultController {

    private final TestResultService testResultService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Create a new test result
     */
    @PostMapping
    public ResponseEntity<TestResultResponse> createTestResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateTestResultRequest request) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("POST /api/v1/test-results - userId: {}, deckId: {}, score: {}", 
                user.getId(), request.getDeckId(), request.getScore());

        TestResult result = testResultService.createTestResult(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(result));
    }

    /**
     * Get test results for a specific deck
     */
    @GetMapping("/deck/{deckId}")
    public ResponseEntity<List<TestResultResponse>> getTestResultsByDeck(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long deckId) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("GET /api/v1/test-results/deck/{} - userId: {}", deckId, user.getId());

        List<TestResult> results = testResultService.getTestResultsByDeck(user.getId(), deckId);
        return ResponseEntity.ok(results.stream()
                .map(this::toResponse)
                .collect(Collectors.toList()));
    }

    /**
     * Get all test results for authenticated user
     */
    @GetMapping
    public ResponseEntity<List<TestResultResponse>> getUserTestResults(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = userDetailsService.getUserByEmail(userDetails.getUsername());
        log.info("GET /api/v1/test-results - userId: {}", user.getId());

        List<TestResult> results = testResultService.getUserTestResults(user.getId());
        return ResponseEntity.ok(results.stream()
                .map(this::toResponse)
                .collect(Collectors.toList()));
    }

    /**
     * Convert entity to response DTO
     */
    private TestResultResponse toResponse(TestResult result) {
        return TestResultResponse.builder()
                .id(result.getId())
                .deckId(result.getDeckId())
                .score(result.getScore())
                .correctCount(result.getCorrectCount())
                .wrongCount(result.getWrongCount())
                .skippedCount(result.getSkippedCount())
                .totalQuestions(result.getTotalQuestions())
                .durationSeconds(result.getDurationSeconds())
                .submittedAt(result.getSubmittedAt())
                .build();
    }
}
