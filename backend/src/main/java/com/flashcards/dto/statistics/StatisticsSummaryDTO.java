package com.flashcards.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatisticsSummaryDTO {
    
    private Integer streak; // Current study streak in days
    
    private Long totalCardsLearned; // Total unique cards studied
    
    private Long dueCardsCount; // Cards that need to be reviewed now
    
    private Map<String, Integer> heatmapData; // Date -> count ("YYYY-MM-DD" -> count)
    
    private PieChartDataDTO pieChartData; // Card status distribution
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PieChartDataDTO {
        private Long newCards;
        private Long learningCards;
        private Long reviewingCards;
        private Long relearningCards;
    }
}
