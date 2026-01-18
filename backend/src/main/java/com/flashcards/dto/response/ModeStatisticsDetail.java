package com.flashcards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Detailed statistics for each study mode
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModeStatisticsDetail {

    /**
     * Study mode name (learn, test, match, srs, review)
     */
    private String mode;

    /**
     * Total time spent in seconds
     */
    private Long timeSpentSeconds;

    /**
     * Formatted time spent (e.g., "1h 30m")
     */
    private String timeSpentFormatted;

    /**
     * Total cards studied in this mode
     */
    private Integer cardsSeen;

    /**
     * Last activity time
     */
    private Instant lastActive;

    /**
     * Last active formatted (e.g., "2 minutes ago")
     */
    private String lastActiveFormatted;

    /**
     * Whether this mode is completed
     */
    private Boolean isCompleted;

    /**
     * Average grade (for test mode only)
     */
    private Double averageGrade;

    /**
     * Number of test submissions (for test mode only)
     */
    private Integer testHistory;

    /**
     * Last submission date (for test mode only)
     */
    private Instant lastSubmission;

    /**
     * Last submission formatted
     */
    private String lastSubmissionFormatted;
}
