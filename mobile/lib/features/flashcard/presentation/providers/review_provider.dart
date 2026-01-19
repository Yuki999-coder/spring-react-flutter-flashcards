import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/card.dart' as domain;
import '../../domain/repositories/flashcard_repository.dart';
import 'repository_provider.dart';
import '../../../../core/utils/srs_algorithm.dart';

part 'review_provider.g.dart';

/// Provider for managing review session state
@riverpod
class ReviewSession extends _$ReviewSession {
  @override
  Future<List<domain.Card>> build(String deckId) async {
    return _fetchDueCards();
  }

  Future<List<domain.Card>> _fetchDueCards() async {
    try {
      final repository = ref.read(flashcardRepositoryProvider);
      return await repository.getCardsDueForReview(arg);
    } catch (e) {
      rethrow;
    }
  }

  /// Refresh the due cards list
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchDueCards());
  }

  /// Review a card with the given grade
  /// Updates the card's SRS data and removes it from the session
  Future<void> reviewCard({
    required String cardId,
    required Grade grade,
  }) async {
    final cards = state.value ?? [];
    final cardIndex = cards.indexWhere((c) => c.id == cardId);
    
    if (cardIndex == -1) return;
    
    final card = cards[cardIndex];
    final repository = ref.read(flashcardRepositoryProvider);

    // Calculate new SRS values using SM-2 algorithm
    final result = SRSAlgorithm.calculateNext(
      grade: grade,
      currentInterval: card.interval ?? 0,
      currentRepetitions: card.reviewCount ?? 0,
      currentEaseFactor: card.easeFactor?.toDouble() ?? SRSAlgorithm.defaultEaseFactor,
      currentLearningState: card.learningState ?? 'NEW',
    );

    final nextReviewDate = SRSAlgorithm.calculateNextReviewDate(result.newInterval);
    final now = DateTime.now();

    // Update card in database
    await repository.updateCardSRS(
      cardId: cardId,
      learningState: result.newLearningState,
      interval: result.newInterval,
      easeFactor: result.newEaseFactor,
      reviewCount: result.newRepetitions,
      nextReview: nextReviewDate,
      lastReviewed: now,
    );

    // Remove card from current session (it's been reviewed)
    final updatedCards = List<domain.Card>.from(cards)..removeAt(cardIndex);
    state = AsyncValue.data(updatedCards);
  }

  /// Get the current card (first in the list)
  domain.Card? getCurrentCard() {
    final cards = state.value;
    if (cards == null || cards.isEmpty) return null;
    return cards.first;
  }

  /// Get the number of remaining cards
  int getRemainingCount() {
    final cards = state.value;
    if (cards == null) return 0;
    return cards.length;
  }

  /// Check if session is complete
  bool isComplete() {
    return getRemainingCount() == 0;
  }
}

/// Provider for review statistics
@riverpod
class ReviewStats extends _$ReviewStats {
  @override
  ReviewStatistics build() {
    return ReviewStatistics.empty();
  }

  void recordReview(Grade grade) {
    final current = state;
    state = ReviewStatistics(
      totalReviewed: current.totalReviewed + 1,
      againCount: grade == Grade.again ? current.againCount + 1 : current.againCount,
      hardCount: grade == Grade.hard ? current.hardCount + 1 : current.hardCount,
      goodCount: grade == Grade.good ? current.goodCount + 1 : current.goodCount,
      easyCount: grade == Grade.easy ? current.easyCount + 1 : current.easyCount,
    );
  }

  void reset() {
    state = ReviewStatistics.empty();
  }
}

class ReviewStatistics {
  final int totalReviewed;
  final int againCount;
  final int hardCount;
  final int goodCount;
  final int easyCount;

  const ReviewStatistics({
    required this.totalReviewed,
    required this.againCount,
    required this.hardCount,
    required this.goodCount,
    required this.easyCount,
  });

  factory ReviewStatistics.empty() {
    return const ReviewStatistics(
      totalReviewed: 0,
      againCount: 0,
      hardCount: 0,
      goodCount: 0,
      easyCount: 0,
    );
  }

  double get accuracy {
    if (totalReviewed == 0) return 0.0;
    return (goodCount + easyCount) / totalReviewed;
  }
}
