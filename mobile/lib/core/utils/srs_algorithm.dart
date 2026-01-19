/// SM-2 Spaced Repetition System Algorithm
/// Based on SuperMemo SM-2 algorithm
/// 
/// Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
/// 
/// Algorithm:
/// - Adjusts review intervals based on user performance
/// - Ease Factor (EF) determines how quickly intervals grow
/// - Failed cards (AGAIN) reset to short intervals
/// - Successful reviews increase intervals exponentially

enum Grade {
  again(0), // Complete failure
  hard(2),  // Difficult but correct
  good(3),  // Normal success
  easy(4);  // Perfect recall

  final int value;
  const Grade(this.value);
}

class SRSResult {
  final int newInterval;        // Days until next review
  final int newRepetitions;     // Number of successful reviews
  final double newEaseFactor;   // Multiplier for interval growth
  final String newLearningState; // NEW, LEARNING_MCQ, LEARNING_TYPING, REVIEWING, RELEARNING

  const SRSResult({
    required this.newInterval,
    required this.newRepetitions,
    required this.newEaseFactor,
    required this.newLearningState,
  });

  @override
  String toString() {
    return 'SRSResult(interval: $newInterval, reps: $newRepetitions, EF: $newEaseFactor, state: $newLearningState)';
  }
}

class SRSAlgorithm {
  // SM-2 Algorithm Constants
  static const double minEaseFactor = 1.3;
  static const int minInterval = 1;
  static const double defaultEaseFactor = 2.5;

  /// Calculate next review parameters using SM-2 algorithm
  /// 
  /// Parameters:
  /// - [grade]: User's performance rating (AGAIN, HARD, GOOD, EASY)
  /// - [currentInterval]: Current interval in days
  /// - [currentRepetitions]: Number of successful reviews
  /// - [currentEaseFactor]: Current ease factor
  /// - [currentLearningState]: Current learning state
  /// 
  /// Returns: [SRSResult] with updated values
  static SRSResult calculateNext({
    required Grade grade,
    required int currentInterval,
    required int currentRepetitions,
    required double currentEaseFactor,
    required String currentLearningState,
  }) {
    int newInterval;
    int newRepetitions;
    double newEaseFactor;
    String newState;

    switch (grade) {
      case Grade.again:
        // Complete failure - reset to relearning
        newRepetitions = 0;
        newInterval = minInterval; // 1 day
        newEaseFactor = (currentEaseFactor - 0.2).clamp(minEaseFactor, double.infinity);
        newState = 'RELEARNING';
        break;

      case Grade.hard:
        // Difficult but correct - minimal increase
        newRepetitions = currentRepetitions + 1;
        newInterval = (currentInterval * 1.2).ceil().clamp(minInterval, double.infinity).toInt();
        newEaseFactor = (currentEaseFactor - 0.15).clamp(minEaseFactor, double.infinity);
        newState = 'REVIEWING';
        break;

      case Grade.good:
        // Normal success - standard SM-2 growth
        newRepetitions = currentRepetitions + 1;
        if (currentInterval == 0) {
          newInterval = minInterval;
        } else {
          newInterval = (currentInterval * currentEaseFactor).ceil().clamp(minInterval, double.infinity).toInt();
        }
        newEaseFactor = currentEaseFactor; // Keep same
        newState = 'REVIEWING';
        break;

      case Grade.easy:
        // Perfect recall - accelerated growth
        newRepetitions = currentRepetitions + 1;
        if (currentInterval == 0) {
          newInterval = minInterval * 2;
        } else {
          newInterval = (currentInterval * currentEaseFactor * 1.3).ceil().clamp(minInterval, double.infinity).toInt();
        }
        newEaseFactor = currentEaseFactor + 0.15;
        newState = 'REVIEWING';
        break;
    }

    return SRSResult(
      newInterval: newInterval,
      newRepetitions: newRepetitions,
      newEaseFactor: newEaseFactor,
      newLearningState: newState,
    );
  }

  /// Calculate next review date from now
  static DateTime calculateNextReviewDate(int intervalDays) {
    return DateTime.now().add(Duration(days: intervalDays));
  }

  /// Check if a card is due for review
  static bool isDue(DateTime? nextReviewDate) {
    if (nextReviewDate == null) return true; // New cards are always due
    return DateTime.now().isAfter(nextReviewDate) || 
           DateTime.now().isAtSameMomentAs(nextReviewDate);
  }

  /// Get human-readable interval description
  static String getIntervalDescription(int days) {
    if (days == 0) return 'New';
    if (days == 1) return '1 day';
    if (days < 7) return '$days days';
    if (days < 30) {
      final weeks = (days / 7).floor();
      return weeks == 1 ? '1 week' : '$weeks weeks';
    }
    if (days < 365) {
      final months = (days / 30).floor();
      return months == 1 ? '1 month' : '$months months';
    }
    final years = (days / 365).floor();
    return years == 1 ? '1 year' : '$years years';
  }

  /// Get grade recommendation based on time taken
  static Grade recommendGrade(int timeTakenSeconds) {
    if (timeTakenSeconds < 3) return Grade.easy;
    if (timeTakenSeconds < 8) return Grade.good;
    if (timeTakenSeconds < 15) return Grade.hard;
    return Grade.again;
  }

  /// Get button color for grade
  static String getGradeColor(Grade grade) {
    switch (grade) {
      case Grade.again:
        return 'red';
      case Grade.hard:
        return 'orange';
      case Grade.good:
        return 'green';
      case Grade.easy:
        return 'blue';
    }
  }

  /// Get button label for grade
  static String getGradeLabel(Grade grade) {
    switch (grade) {
      case Grade.again:
        return 'Lại';
      case Grade.hard:
        return 'Khó';
      case Grade.good:
        return 'Tốt';
      case Grade.easy:
        return 'Dễ';
    }
  }

  /// Get button subtitle showing interval
  static String getGradeSubtitle(Grade grade, int currentInterval, double currentEaseFactor) {
    final result = calculateNext(
      grade: grade,
      currentInterval: currentInterval,
      currentRepetitions: 0,
      currentEaseFactor: currentEaseFactor,
      currentLearningState: 'REVIEWING',
    );
    return getIntervalDescription(result.newInterval);
  }
}
