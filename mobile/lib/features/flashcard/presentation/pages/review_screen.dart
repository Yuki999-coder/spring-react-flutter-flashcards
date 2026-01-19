import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:appinio_swiper/appinio_swiper.dart';
import '../../domain/entities/deck.dart';
import '../../domain/entities/card.dart' as domain;
import '../providers/review_provider.dart';
import '../../../../core/utils/srs_algorithm.dart';

class ReviewScreen extends ConsumerStatefulWidget {
  final Deck deck;

  const ReviewScreen({
    super.key,
    required this.deck,
  });

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  final AppinioSwiperController _swiperController = AppinioSwiperController();
  bool _isFlipped = false;
  DateTime? _cardShownAt; // Track when card was shown

  @override
  void dispose() {
    _swiperController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    // Start timer when first card is shown
    _cardShownAt = DateTime.now();
  }

  @override
  Widget build(BuildContext context) {
    final reviewSessionAsync = ref.watch(reviewSessionProvider(widget.deck.id));
    final stats = ref.watch(reviewStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.deck.title),
            reviewSessionAsync.maybeWhen(
              data: (cards) => Text(
                '${cards.length} thẻ còn lại',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.analytics_outlined),
            onPressed: () => _showStats(context, stats),
          ),
        ],
      ),
      body: reviewSessionAsync.when(
        data: (cards) {
          if (cards.isEmpty) {
            return _buildCompleteState(context, stats);
          }

          return Column(
            children: [
              // Progress indicator
              _buildProgressIndicator(cards.length, stats.totalReviewed),

              // Card swiper
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: AppinioSwiper(
                    controller: _swiperController,
                    cards: cards.map((card) => _buildFlipCard(card)).toList(),
                    onSwipe: (index, direction) {
                      _handleSwipe(cards[index], direction);
                    },
                    onEnd: () {
                      // All cards swiped
                      setState(() {});
                    },
                    swipeOptions: const SwipeOptions(
                      direction: SwipeDirection.all,
                    ),
                    allowUnswipe: false,
                  ),
                ),
              ),

              // Action buttons
              _buildActionButtons(cards.first),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Lỗi: ${error.toString()}'),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  ref.read(reviewSessionProvider(widget.deck.id).notifier).refresh();
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressIndicator(int remaining, int reviewed) {
    final total = remaining + reviewed;
    final progress = total > 0 ? reviewed / total : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Đã học: $reviewed / $total',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              Text(
                '${(progress * 100).toStringAsFixed(0)}%',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress,
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      ),
    );
  }

  Widget _buildFlipCard(domain.Card card) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _isFlipped = !_isFlipped;
        });
      },
      child: TweenAnimationBuilder(
        tween: Tween<double>(begin: 0, end: _isFlipped ? 1 : 0),
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
        builder: (context, double value, child) {
          final angle = value * pi;
          final isFront = value < 0.5;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: isFront
                ? _buildCardFront(card)
                : Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(pi),
                    child: _buildCardBack(card),
                  ),
          );
        },
      ),
    );
  }

  Widget _buildCardFront(domain.Card card) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).primaryColor.withOpacity(0.1),
              Theme.of(context).primaryColor.withOpacity(0.05),
            ],
          ),
        ),
        child: Stack(
          children: [
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.book_outlined,
                      size: 48,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      card.front,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.touch_app, size: 16),
                          SizedBox(width: 8),
                          Text('Chạm để lật thẻ'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Learning state badge
            Positioned(
              top: 16,
              right: 16,
              child: _buildLearningStateBadge(card),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardBack(domain.Card card) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.green.withOpacity(0.1),
              Colors.blue.withOpacity(0.05),
            ],
          ),
        ),
        child: Stack(
          children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.description_outlined,
                      size: 48,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      card.back,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (card.example != null && card.example!.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.amber.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.amber.withOpacity(0.3),
                          ),
                        ),
                        child: Column(
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.lightbulb_outline, size: 20, color: Colors.amber),
                                SizedBox(width: 8),
                                Text(
                                  'Ví dụ',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: Colors.amber,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              card.example!,
                              style: const TextStyle(
                                fontSize: 16,
                                fontStyle: FontStyle.italic,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.swipe, size: 16),
                          SizedBox(width: 8),
                          Text('Vuốt hoặc nhấn nút bên dưới'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLearningStateBadge(domain.Card card) {
    final state = card.learningState ?? 'NEW';
    Color color;
    String label;

    switch (state) {
      case 'NEW':
        color = Colors.grey;
        label = 'Mới';
        break;
      case 'LEARNING_MCQ':
      case 'LEARNING_TYPING':
        color = Colors.blue;
        label = 'Đang học';
        break;
      case 'REVIEWING':
        if ((card.interval ?? 0) >= 21) {
          color = Colors.green;
          label = 'Đã thuộc';
        } else if ((card.interval ?? 0) >= 3) {
          color = Colors.orange;
          label = 'Sắp thuộc';
        } else {
          color = Colors.blue;
          label = 'Đang học';
        }
        break;
      case 'RELEARNING':
        color = Colors.red;
        label = 'Ôn lại';
        break;
      default:
        color = Colors.grey;
        label = 'Mới';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildActionButtons(domain.Card card) {
    if (!_isFlipped) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: const Text(
          'Lật thẻ để đánh giá',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: Colors.grey,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: _buildGradeButton(
              grade: Grade.again,
              card: card,
              color: Colors.red,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildGradeButton(
              grade: Grade.hard,
              card: card,
              color: Colors.orange,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildGradeButton(
              grade: Grade.good,
              card: card,
              color: Colors.green,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildGradeButton(
              grade: Grade.easy,
              card: card,
              color: Colors.blue,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGradeButton({
    required Grade grade,
    required domain.Card card,
    required Color color,
  }) {
    final subtitle = SRSAlgorithm.getGradeSubtitle(
      grade,
      card.interval ?? 0,
      card.easeFactor?.toDouble() ?? SRSAlgorithm.defaultEaseFactor,
    );

    return ElevatedButton(
      onPressed: () => _handleGrade(grade, card),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Column(
        children: [
          Text(
            SRSAlgorithm.getGradeLabel(grade),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  void _handleSwipe(domain.Card card, SwipeDirection direction) {
    Grade? grade;
    switch (direction) {
      case SwipeDirection.left:
        grade = Grade.again;
        break;
      case SwipeDirection.down:
        grade = Grade.hard;
        break;
      case SwipeDirection.up:
        grade = Grade.good;
        break;
      case SwipeDirection.right:
        grade = Grade.easy;
        break;
    }

    if (grade != null) {
      _submitReview(grade, card);
    }

    // Reset flip state and restart timer for next card
    setState(() {
      _isFlipped = false;
      _cardShownAt = DateTime.now();
    });
  }

  void _handleGrade(Grade grade, domain.Card card) {
    _submitReview(grade, card);
    
    // Trigger swipe animation
    _swiperController.swipe();

    // Reset flip state and restart timer for next card
    setState(() {
      _isFlipped = false;
      _cardShownAt = DateTime.now();
    });
  }

  void _submitReview(Grade grade, domain.Card card) {
    // Calculate time taken in seconds
    int? timeTaken;
    if (_cardShownAt != null) {
      timeTaken = DateTime.now().difference(_cardShownAt!).inSeconds;
    }

    ref.read(reviewStatsProvider.notifier).recordReview(grade);
    ref.read(reviewSessionProvider(widget.deck.id).notifier).reviewCard(
          cardId: card.id,
          grade: grade,
          timeTakenSeconds: timeTaken,
        );
  }

  Widget _buildCompleteState(BuildContext context, ReviewStatistics stats) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.celebration_outlined,
              size: 100,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(height: 24),
            const Text(
              'Hoàn thành!',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Bạn đã học xong tất cả các thẻ',
              style: TextStyle(fontSize: 18, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            _buildStatsCard(stats),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Quay lại'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    ref.read(reviewSessionProvider(widget.deck.id).notifier).refresh();
                    ref.read(reviewStatsProvider.notifier).reset();
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Học lại'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 16,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCard(ReviewStatistics stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text(
              'Thống kê',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('Tổng', stats.totalReviewed.toString(), Colors.blue),
                _buildStatItem('Lại', stats.againCount.toString(), Colors.red),
                _buildStatItem('Khó', stats.hardCount.toString(), Colors.orange),
                _buildStatItem('Tốt', stats.goodCount.toString(), Colors.green),
                _buildStatItem('Dễ', stats.easyCount.toString(), Colors.blue),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: stats.accuracy,
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),
            const SizedBox(height: 8),
            Text(
              'Độ chính xác: ${(stats.accuracy * 100).toStringAsFixed(1)}%',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  void _showStats(BuildContext context, ReviewStatistics stats) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thống kê phiên học'),
        content: _buildStatsCard(stats),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }
}
