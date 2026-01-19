import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../../domain/entities/deck.dart' as domain;
import '../../domain/entities/card.dart' as domain;
import '../../domain/repositories/flashcard_repository.dart';
import '../datasources/local_db/app_database.dart';
import '../../../../core/constants/app_constants.dart';

/// Implementation of FlashcardRepository using Drift (SQLite)
class FlashcardRepositoryImpl implements FlashcardRepository {
  final AppDatabase _database;
  final Uuid _uuid = const Uuid();

  FlashcardRepositoryImpl(this._database);

  // ==================== MAPPERS ====================

  /// Map Drift DeckEntity to Domain Deck
  domain.Deck _deckEntityToDomain(DeckEntity entity) {
    return domain.Deck(
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      description: entity.description,
      folderId: entity.folderId,
      syncStatus: entity.syncStatus,
      serverUpdatedAt: entity.serverUpdatedAt != null
          ? DateTime.parse(entity.serverUpdatedAt!)
          : null,
      localUpdatedAt: DateTime.parse(entity.localUpdatedAt),
      createdAt: DateTime.parse(entity.createdAt),
      isDeleted: entity.isDeleted,
    );
  }

  /// Map Drift CardEntity to Domain Card
  domain.Card _cardEntityToDomain(CardEntity entity) {
    return domain.Card(
      id: entity.id,
      deckId: entity.deckId,
      front: entity.front,
      back: entity.back,
      example: entity.example,
      imageUrl: entity.imageUrl,
      audioUrl: entity.audioUrl,
      position: entity.position,
      learningState: entity.learningState,
      interval: entity.interval,
      easeFactor: entity.easeFactor,
      reviewCount: entity.reviewCount,
      nextReview: entity.nextReview != null
          ? DateTime.parse(entity.nextReview!)
          : null,
      lastReviewed: entity.lastReviewed != null
          ? DateTime.parse(entity.lastReviewed!)
          : null,
      syncStatus: entity.syncStatus,
      serverUpdatedAt: entity.serverUpdatedAt != null
          ? DateTime.parse(entity.serverUpdatedAt!)
          : null,
      localUpdatedAt: DateTime.parse(entity.localUpdatedAt),
      createdAt: DateTime.parse(entity.createdAt),
      isDeleted: entity.isDeleted,
    );
  }

  // ==================== DECK OPERATIONS ====================

  @override
  Future<List<domain.Deck>> getDecks() async {
    final entities = await _database.getAllDecks();
    return entities.map(_deckEntityToDomain).toList();
  }

  @override
  Future<domain.Deck?> getDeckById(String id) async {
    final entity = await _database.getDeckById(id);
    return entity != null ? _deckEntityToDomain(entity) : null;
  }

  @override
  Future<List<domain.Deck>> getDecksByFolder(String folderId) async {
    final entities = await _database.getDecksByFolder(folderId);
    return entities.map(_deckEntityToDomain).toList();
  }

  @override
  Future<List<domain.Deck>> getUncategorizedDecks() async {
    final entities = await _database.getUncategorizedDecks();
    return entities.map(_deckEntityToDomain).toList();
  }

  @override
  Future<domain.Deck> createDeck({
    required String title,
    String? description,
    String? folderId,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final newId = _uuid.v4();

    final companion = DecksCompanion(
      id: Value(newId),
      userId: const Value('local-user'), // TODO: Replace with actual user ID from auth
      title: Value(title),
      description: Value(description),
      folderId: Value(folderId),
      syncStatus: Value(SyncStatus.pending.value),
      serverUpdatedAt: const Value(null),
      localUpdatedAt: Value(now),
      createdAt: Value(now),
      isDeleted: const Value(false),
    );

    await _database.upsertDeck(companion);

    final entity = await _database.getDeckById(newId);
    return _deckEntityToDomain(entity!);
  }

  @override
  Future<domain.Deck> updateDeck({
    required String id,
    String? title,
    String? description,
    String? folderId,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();

    final companion = DecksCompanion(
      id: Value(id),
      title: title != null ? Value(title) : const Value.absent(),
      description: description != null ? Value(description) : const Value.absent(),
      folderId: folderId != null ? Value(folderId) : const Value.absent(),
      syncStatus: Value(SyncStatus.pending.value),
      localUpdatedAt: Value(now),
    );

    await _database.upsertDeck(companion);

    final entity = await _database.getDeckById(id);
    return _deckEntityToDomain(entity!);
  }

  @override
  Future<void> deleteDeck(String id) async {
    await _database.softDeleteDeck(id);
  }

  @override
  Future<List<domain.Deck>> getDecksPendingSync() async {
    final entities = await _database.getDecksPendingSync();
    return entities.map(_deckEntityToDomain).toList();
  }

  // ==================== CARD OPERATIONS ====================

  @override
  Future<List<domain.Card>> getCardsByDeck(String deckId) async {
    final entities = await _database.getCardsByDeck(deckId);
    return entities.map(_cardEntityToDomain).toList();
  }

  @override
  Future<domain.Card?> getCardById(String id) async {
    final entity = await _database.getCardById(id);
    return entity != null ? _cardEntityToDomain(entity) : null;
  }

  @override
  Future<List<domain.Card>> getCardsDueForReview(String deckId) async {
    final now = DateTime.now();
    final entities = await _database.getCardsDueForReview(deckId, now);
    return entities.map(_cardEntityToDomain).toList();
  }

  @override
  Future<List<domain.Card>> getNewCards(String deckId, {int limit = 20}) async {
    final entities = await _database.getNewCards(deckId, limit);
    return entities.map(_cardEntityToDomain).toList();
  }

  @override
  Future<domain.Card> createCard({
    required String deckId,
    required String front,
    required String back,
    String? example,
    String? imageUrl,
    String? audioUrl,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final newId = _uuid.v4();

    // Get current card count for position
    final existingCards = await _database.getCardsByDeck(deckId);
    final position = existingCards.length;

    final companion = CardsCompanion(
      id: Value(newId),
      deckId: Value(deckId),
      front: Value(front),
      back: Value(back),
      example: Value(example),
      imageUrl: Value(imageUrl),
      audioUrl: Value(audioUrl),
      position: Value(position),
      learningState: const Value('NEW'),
      interval: const Value(0),
      easeFactor: const Value(250), // 2.5 * 100
      reviewCount: const Value(0),
      nextReview: const Value(null),
      lastReviewed: const Value(null),
      syncStatus: Value(SyncStatus.pending.value),
      serverUpdatedAt: const Value(null),
      localUpdatedAt: Value(now),
      createdAt: Value(now),
      isDeleted: const Value(false),
    );

    await _database.upsertCard(companion);

    final entity = await _database.getCardById(newId);
    return _cardEntityToDomain(entity!);
  }

  @override
  Future<domain.Card> updateCard({
    required String id,
    String? front,
    String? back,
    String? example,
    String? imageUrl,
    String? audioUrl,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();

    final companion = CardsCompanion(
      id: Value(id),
      front: front != null ? Value(front) : const Value.absent(),
      back: back != null ? Value(back) : const Value.absent(),
      example: example != null ? Value(example) : const Value.absent(),
      imageUrl: imageUrl != null ? Value(imageUrl) : const Value.absent(),
      audioUrl: audioUrl != null ? Value(audioUrl) : const Value.absent(),
      syncStatus: Value(SyncStatus.pending.value),
      localUpdatedAt: Value(now),
    );

    await _database.upsertCard(companion);

    final entity = await _database.getCardById(id);
    return _cardEntityToDomain(entity!);
  }

  @override
  Future<void> deleteCard(String id) async {
    await _database.softDeleteCard(id);
  }

  @override
  Future<domain.Card> updateCardSRS({
    required String cardId,
    required String learningState,
    required int interval,
    required double easeFactor,
    required int reviewCount,
    DateTime? nextReview,
    required DateTime lastReviewed,
  }) async {
    await _database.updateCardSRS(
      cardId: cardId,
      learningState: learningState,
      interval: interval,
      easeFactor: easeFactor,
      reviewCount: reviewCount,
      nextReview: nextReview?.toUtc().toIso8601String(),
      lastReviewed: lastReviewed.toUtc().toIso8601String(),
    );

    final entity = await _database.getCardById(cardId);
    return _cardEntityToDomain(entity!);
  }

  @override
  Future<List<domain.Card>> getCardsPendingSync() async {
    final entities = await _database.getCardsPendingSync();
    return entities.map(_cardEntityToDomain).toList();
  }
}
