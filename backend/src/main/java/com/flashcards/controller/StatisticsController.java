package com.flashcards.controller;

import com.flashcards.dto.statistics.StatisticsSummaryDTO;
import com.flashcards.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    
    private final StatisticsService statisticsService;
    
    @GetMapping("/summary")
    public ResponseEntity<StatisticsSummaryDTO> getStatisticsSummary(Authentication authentication) {
        String userEmail = authentication.getName();
        log.info("GET /api/v1/statistics/summary - User: {}", userEmail);
        
        StatisticsSummaryDTO summary = statisticsService.getStatisticsSummary(userEmail);
        return ResponseEntity.ok(summary);
    }
}
