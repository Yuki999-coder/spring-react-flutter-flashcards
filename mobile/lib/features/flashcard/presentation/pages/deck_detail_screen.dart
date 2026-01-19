import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/deck.dart';
import '../../domain/entities/card.dart' as domain;
import '../providers/card_list_provider.dart';
import '../providers/review_provider.dart';
import '../widgets/card_list_item.dart';
import 'add_edit_card_screen.dart';
import 'review_screen.dart';

class DeckDetailScreen extends ConsumerStatefulWidget {
  final Deck deck;

  const DeckDetailScreen({
    super.key,
    required this.deck,
  });

  @override
  ConsumerState<DeckDetailScreen> createState() => _DeckDetailScreenState();
}

class _DeckDetailScreenState extends ConsumerState<DeckDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final cardListAsync = ref.watch(cardListProvider(widget.deck.id));

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.deck.title,
              style: const TextStyle(fontSize: 18),
            ),
            if (widget.deck.description != null &&
                widget.deck.description!.isNotEmpty)
              Text(
                widget.deck.description!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                  color: Colors.grey,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(cardListProvider(widget.deck.id).notifier).refresh();
            },
          ),
        ],
      ),
      body: cardListAsync.when(
        data: (cards) {
          if (cards.isEmpty) {
            return _buildEmptyState(context);
          }

          return RefreshIndicator(
            onRefresh: () async {
              await ref
                  .read(cardListProvider(widget.deck.id).notifier)
                  .refresh();
            },
            child: Column(
              children: [
                // Study button (if cards available)
                _buildStudyButton(context, cards),

                // Header with count
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.05),
                    border: Border(
                      bottom: BorderSide(
                        color: Colors.grey.withOpacity(0.2),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.credit_card,
                        size: 20,
                        color: Theme.of(context).primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${cards.length} thẻ',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                      const Spacer(),
                      // Filter or sort buttons can go here
                    ],
                  ),
                ),

                // Card list
                Expanded(
                  child: ListView.builder(
                    itemCount: cards.length,
                    padding: const EdgeInsets.only(top: 8, bottom: 80),
                    itemBuilder: (context, index) {
                      final card = cards[index];
                      return Dismissible(
                        key: Key(card.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          color: Colors.red,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          child: const Icon(
                            Icons.delete,
                            color: Colors.white,
                          ),
                        ),
                        confirmDismiss: (direction) async {
                          return await _showDeleteConfirmation(context, card);
                        },
                        onDismissed: (direction) {
                          _deleteCard(card.id);
                        },
                        child: CardListItem(
                          card: card,
                          onTap: () => _viewCard(context, card),
                          onEdit: () => _editCard(context, card),
                          onDelete: () => _showDeleteDialog(context, card),
                          onToggleStar: () => _toggleStar(card),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red,
              ),
              const SizedBox(height: 16),
              Text(
                'Lỗi: ${error.toString()}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  ref
                      .read(cardListProvider(widget.deck.id).notifier)
                      .refresh();
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addCard(context),
        icon: const Icon(Icons.add),
        label: const Text('Thêm thẻ'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.credit_card_off,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Chưa có thẻ nào',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Nhấn nút bên dưới để thêm thẻ đầu tiên',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _addCard(context),
            icon: const Icon(Icons.add),
            label: const Text('Thêm thẻ đầu tiên'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _addCard(BuildContext context) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => AddEditCardScreen(
          deckId: widget.deck.id,
        ),
      ),
    );

    if (result == true && mounted) {
      ref.read(cardListProvider(widget.deck.id).notifier).refresh();
    }
  }

  void _editCard(BuildContext context, domain.Card card) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => AddEditCardScreen(
          deckId: widget.deck.id,
          card: card,
        ),
      ),
    );

    if (result == true && mounted) {
      ref.read(cardListProvider(widget.deck.id).notifier).refresh();
    }
  }

  void _viewCard(BuildContext context, domain.Card card) {
    // Show a dialog or navigate to a detail view
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Chi tiết thẻ'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Thuật ngữ',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                card.front,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              const Text(
                'Định nghĩa',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                card.back,
                style: const TextStyle(fontSize: 16),
              ),
              if (card.example != null && card.example!.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Ví dụ',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  card.example!,
                  style: const TextStyle(
                    fontSize: 14,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Đóng'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _editCard(context, card);
            },
            child: const Text('Chỉnh sửa'),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, domain.Card card) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa thẻ'),
        content: const Text('Bạn có chắc muốn xóa thẻ này không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _deleteCard(card.id);
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
  }

  Future<bool> _showDeleteConfirmation(
    BuildContext context,
    domain.Card card,
  ) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Xóa thẻ'),
            content: Text('Xóa thẻ "${card.front}"?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Hủy'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.red,
                ),
                child: const Text('Xóa'),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _deleteCard(String cardId) async {
    try {
      await ref.read(cardListProvider(widget.deck.id).notifier).deleteCard(cardId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã xóa thẻ'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _toggleStar(domain.Card card) async {
    try {
      await ref
          .read(cardListProvider(widget.deck.id).notifier)
          .toggleStar(card.id, card.isStarred);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildStudyButton(BuildContext context, List<domain.Card> allCards) {
    // Check for due cards using reviewSessionProvider
    final dueCardsAsync = ref.watch(reviewSessionProvider(widget.deck.id));

    return dueCardsAsync.when(
      data: (dueCards) {
        final dueCount = dueCards.length;
        
        return Container(
          width: double.infinity,
          margin: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: dueCount > 0
                ? () => _startStudySession(context)
                : null,
            icon: const Icon(Icons.school, size: 24),
            label: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                children: [
                  Text(
                    dueCount > 0 ? 'Học ngay' : 'Không có thẻ cần học',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (dueCount > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      '$dueCount thẻ đến hạn ôn tập',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 4),
                    const Text(
                      'Quay lại sau để ôn tập',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: dueCount > 0
                  ? Theme.of(context).primaryColor
                  : Colors.grey,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        );
      },
      loading: () => Container(
        margin: const EdgeInsets.all(16),
        child: const LinearProgressIndicator(),
      ),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  void _startStudySession(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ReviewScreen(deck: widget.deck),
      ),
    );
    
    // Refresh cards after study session
    if (mounted) {
      ref.read(cardListProvider(widget.deck.id).notifier).refresh();
      ref.read(reviewSessionProvider(widget.deck.id).notifier).refresh();
    }
  }
}
