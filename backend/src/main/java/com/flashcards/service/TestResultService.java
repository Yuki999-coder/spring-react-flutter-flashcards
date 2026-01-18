package com.flashcards.service;

import com.flashcards.dto.request.CreateTestResultRequest;
import com.flashcards.model.entity.TestResult;
import com.flashcards.model.entity.User;
import com.flashcards.repository.TestResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing test results
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TestResultService {

    private final TestResultRepository testResultRepository;

    /**
     * Create a new test result
     */
    @Transactional
    public TestResult createTestResult(User user, CreateTestResultRequest request) {
        log.info("Creating test result: userId={}, deckId={}, score={}", 
                user.getId(), request.getDeckId(), request.getScore());

        TestResult result = TestResult.builder()
                .userId(user.getId())
                .deckId(UUID.fromString(request.getDeckId()))
                .score(request.getScore())
                .correctCount(request.getCorrectCount())
                .wrongCount(request.getWrongCount())
                .skippedCount(request.getSkippedCount())
                .totalQuestions(request.getTotalQuestions())
                .durationSeconds(request.getDurationSeconds())
                .build();

        return testResultRepository.save(result);
    }

    /**
     * Get all test results for a user and deck
     */
    public List<TestResult> getTestResultsByDeck(UUID userId, UUID deckId) {
        return testResultRepository.findByUserIdAndDeckIdOrderBySubmittedAtDesc(userId, deckId);
    }

    /**
     * Get all test results for a user
     */
    public List<TestResult> getUserTestResults(UUID userId) {
        return testResultRepository.findByUserIdOrderBySubmittedAtDesc(userId);
    }
}
