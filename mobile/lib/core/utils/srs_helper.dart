import 'srs_algorithm.dart';
export 'srs_algorithm.dart';

/// SRSHelper - Wrapper around SRSAlgorithm for easy access
/// 
/// This is a convenience class that provides a simpler interface
/// to the SM-2 Spaced Repetition algorithm implementation.
/// 
/// Usage:
/// ```dart
/// final helper = SRSHelper();
/// final result = helper.calculateNext(
///   rating: 3, // Good
///   currentInterval: 7,
///   currentRepetitions: 2,
///   currentEaseFactor: 2.5,
///   currentLearningState: 'REVIEWING',
/// );
/// ```
class SRSHelper {
  /// Calculate next review schedule based on user rating
  /// 
  /// Parameters:
  /// - [rating]: User's performance (0=Again, 2=Hard, 3=Good, 4=Easy)
  /// - [currentInterval]: Current interval in days
  /// - [currentRepetitions]: Number of successful reviews
  /// - [currentEaseFactor]: Current ease factor (default: 2.5)
  /// - [currentLearningState]: Current learning state
  /// 
  /// Returns: [SRSResult] with new interval, ease factor, and learning state
  SRSResult calculateNext({
    required int rating,
    required int currentInterval,
    required int currentRepetitions,
    required double currentEaseFactor,
    required String currentLearningState,
  }) {
    final grade = _ratingToGrade(rating);
    
    return SRSAlgorithm.calculateNext(
      grade: grade,
      currentInterval: currentInterval,
      currentRepetitions: currentRepetitions,
      currentEaseFactor: currentEaseFactor,
      currentLearningState: currentLearningState,
    );
  }

  /// Calculate next review date from now
  DateTime calculateNextReviewDate(int intervalDays) {
    return SRSAlgorithm.calculateNextReviewDate(intervalDays);
  }

  /// Check if a card is due for review
  bool isDue(DateTime? nextReviewDate) {
    return SRSAlgorithm.isDue(nextReviewDate);
  }

  /// Get human-readable interval description
  String getIntervalDescription(int days) {
    return SRSAlgorithm.getIntervalDescription(days);
  }

  /// Get grade recommendation based on time taken
  Grade recommendGrade(int timeTakenSeconds) {
    return SRSAlgorithm.recommendGrade(timeTakenSeconds);
  }

  /// Convert integer rating to Grade enum
  Grade _ratingToGrade(int rating) {
    switch (rating) {
      case 0:
        return Grade.again;
      case 2:
        return Grade.hard;
      case 3:
        return Grade.good;
      case 4:
        return Grade.easy;
      default:
        throw ArgumentError('Invalid rating: $rating. Must be 0, 2, 3, or 4.');
    }
  }

  /// Convert Grade enum to integer rating
  int gradeToRating(Grade grade) {
    return grade.value;
  }

  /// Get button color for rating
  String getRatingColor(int rating) {
    final grade = _ratingToGrade(rating);
    return SRSAlgorithm.getGradeColor(grade);
  }

  /// Get button label for rating
  String getRatingLabel(int rating) {
    final grade = _ratingToGrade(rating);
    return SRSAlgorithm.getGradeLabel(grade);
  }

  /// Get button subtitle showing predicted interval
  String getRatingSubtitle(int rating, int currentInterval, double currentEaseFactor) {
    final grade = _ratingToGrade(rating);
    return SRSAlgorithm.getGradeSubtitle(grade, currentInterval, currentEaseFactor);
  }

  // Constants
  static const double defaultEaseFactor = SRSAlgorithm.defaultEaseFactor;
  static const double minEaseFactor = SRSAlgorithm.minEaseFactor;
  static const int minInterval = SRSAlgorithm.minInterval;
}
