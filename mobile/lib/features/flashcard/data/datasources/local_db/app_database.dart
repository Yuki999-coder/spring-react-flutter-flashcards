import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';
import 'package:sqlite3/sqlite3.dart';

part 'app_database.g.dart';

/// Decks Table
/// Stores flashcard decks with offline-first sync support
@DataClassName('DeckEntity')
class Decks extends Table {
  /// UUID as primary key (from server)
  TextColumn get id => text()();
  
  /// User ID who owns this deck
  TextColumn get userId => text()();
  
  /// Deck title
  TextColumn get title => text().withLength(min: 1, max: 255)();
  
  /// Optional description
  TextColumn get description => text().nullable()();
  
  /// Folder ID (nullable - deck can be uncategorized)
  TextColumn get folderId => text().nullable()();
  
  /// Sync status: 0 = synced, 1 = pending, 2 = conflict
  IntColumn get syncStatus => integer().withDefault(const Constant(1))();
  
  /// Last updated timestamp from server (ISO 8601 string)
  TextColumn get serverUpdatedAt => text().nullable()();
  
  /// Local update timestamp (ISO 8601 string)
  TextColumn get localUpdatedAt => text()();
  
  /// Created timestamp (ISO 8601 string)
  TextColumn get createdAt => text()();
  
  /// Soft delete flag
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  
  @override
  Set<Column> get primaryKey => {id};
}

/// Cards Table
/// Stores flashcards with SRS (Spaced Repetition System) data
@DataClassName('CardEntity')
class Cards extends Table {
  /// UUID as primary key (from server)
  TextColumn get id => text()();
  
  /// Foreign key to Decks table
  TextColumn get deckId => text().references(Decks, #id, onDelete: KeyAction.cascade)();
  
  /// Front of card (term/question)
  TextColumn get front => text().withLength(min: 1)();
  
  /// Back of card (definition/answer)
  TextColumn get back => text().withLength(min: 1)();
  
  /// Optional example or hint
  TextColumn get example => text().nullable()();
  
  /// Image URL (nullable)
  TextColumn get imageUrl => text().nullable()();
  
  /// Audio URL (nullable)
  TextColumn get audioUrl => text().nullable()();
  
  /// Position/order in deck
  IntColumn get position => integer().withDefault(const Constant(0))();
  
  /// Learning state: NEW, LEARNING_MCQ, LEARNING_TYPING, REVIEWING, RELEARNING
  TextColumn get learningState => text().withDefault(const Constant('NEW'))();
  
  /// SRS: Interval in days
  IntColumn get interval => integer().withDefault(const Constant(0))();
  
  /// SRS: Ease factor (multiplied by 100, e.g., 250 = 2.5)
  IntColumn get easeFactor => integer().withDefault(const Constant(250))();
  
  /// SRS: Number of reviews
  IntColumn get reviewCount => integer().withDefault(const Constant(0))();
  
  /// SRS: Next review date (ISO 8601 string, nullable)
  TextColumn get nextReview => text().nullable()();
  
  /// Last reviewed timestamp (ISO 8601 string, nullable)
  TextColumn get lastReviewed => text().nullable()();
  
  /// Sync status: 0 = synced, 1 = pending, 2 = conflict
  IntColumn get syncStatus => integer().withDefault(const Constant(1))();
  
  /// Last updated timestamp from server (ISO 8601 string)
  TextColumn get serverUpdatedAt => text().nullable()();
  
  /// Local update timestamp (ISO 8601 string)
  TextColumn get localUpdatedAt => text()();
  
  /// Created timestamp (ISO 8601 string)
  TextColumn get createdAt => text()();
  
  /// Soft delete flag
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  
  @override
  Set<Column> get primaryKey => {id};
}

/// Review Log Table
/// Tracks review history for analytics and statistics
@DataClassName('ReviewLogEntity')
class ReviewLogs extends Table {
  /// Auto-increment ID
  IntColumn get id => integer().autoIncrement()();
  
  /// Foreign key to Cards table
  TextColumn get cardId => text().references(Cards, #id, onDelete: KeyAction.cascade)();
  
  /// Foreign key to Decks table (for easier querying)
  TextColumn get deckId => text().references(Decks, #id, onDelete: KeyAction.cascade)();
  
  /// User ID who performed the review
  TextColumn get userId => text()();
  
  /// User's rating: 0 = Again, 2 = Hard, 3 = Good, 4 = Easy
  IntColumn get rating => integer()();
  
  /// Time taken to review in seconds
  IntColumn get timeTakenSeconds => integer().nullable()();
  
  /// Interval BEFORE this review (days)
  IntColumn get previousInterval => integer()();
  
  /// Interval AFTER this review (days)
  IntColumn get newInterval => integer()();
  
  /// Ease Factor BEFORE this review
  IntColumn get previousEaseFactor => integer()();
  
  /// Ease Factor AFTER this review
  IntColumn get newEaseFactor => integer()();
  
  /// Learning state AFTER this review
  TextColumn get learningState => text()();
  
  /// Review timestamp (ISO 8601 string)
  TextColumn get reviewedAt => text()();
  
  /// Sync status: 0 = synced, 1 = pending
  IntColumn get syncStatus => integer().withDefault(const Constant(1))();
}

/// Main Database Class
@DriftDatabase(tables: [Decks, Cards, ReviewLogs])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) async {
      await m.createAll();
    },
    onUpgrade: (Migrator m, int from, int to) async {
      if (from < 2) {
        // Migration from v1 to v2: Add ReviewLogs table
        await m.createTable(reviewLogs);
      }
    },
  );

  // ==================== DECK QUERIES ====================
  
  /// Get all non-deleted decks
  Future<List<DeckEntity>> getAllDecks() {
    return (select(decks)..where((tbl) => tbl.isDeleted.equals(false))).get();
  }
  
  /// Get deck by ID
  Future<DeckEntity?> getDeckById(String id) {
    return (select(decks)
      ..where((tbl) => tbl.id.equals(id) & tbl.isDeleted.equals(false)))
        .getSingleOrNull();
  }
  
  /// Get decks by folder ID
  Future<List<DeckEntity>> getDecksByFolder(String folderId) {
    return (select(decks)
      ..where((tbl) => tbl.folderId.equals(folderId) & tbl.isDeleted.equals(false)))
        .get();
  }
  
  /// Get uncategorized decks (no folder)
  Future<List<DeckEntity>> getUncategorizedDecks() {
    return (select(decks)
      ..where((tbl) => tbl.folderId.isNull() & tbl.isDeleted.equals(false)))
        .get();
  }
  
  /// Insert or update deck
  Future<int> upsertDeck(DecksCompanion deck) {
    return into(decks).insertOnConflictUpdate(deck);
  }
  
  /// Soft delete deck
  Future<int> softDeleteDeck(String id) {
    return (update(decks)..where((tbl) => tbl.id.equals(id)))
        .write(const DecksCompanion(isDeleted: Value(true)));
  }
  
  /// Get decks pending sync
  Future<List<DeckEntity>> getDecksPendingSync() {
    return (select(decks)
      ..where((tbl) => tbl.syncStatus.equals(1)))
        .get();
  }

  // ==================== CARD QUERIES ====================
  
  /// Get all cards for a deck
  Future<List<CardEntity>> getCardsByDeck(String deckId) {
    return (select(cards)
      ..where((tbl) => tbl.deckId.equals(deckId) & tbl.isDeleted.equals(false))
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.position)]))
        .get();
  }
  
  /// Get card by ID
  Future<CardEntity?> getCardById(String id) {
    return (select(cards)
      ..where((tbl) => tbl.id.equals(id) & tbl.isDeleted.equals(false)))
        .getSingleOrNull();
  }
  
  /// Get cards due for review
  Future<List<CardEntity>> getCardsDueForReview(String deckId, DateTime now) {
    final nowStr = now.toIso8601String();
    return (select(cards)
      ..where((tbl) => 
        tbl.deckId.equals(deckId) & 
        tbl.isDeleted.equals(false) &
        tbl.nextReview.isNotNull() &
        tbl.nextReview.isSmallerOrEqualValue(nowStr)))
        .get();
  }
  
  /// Get new cards (never studied)
  Future<List<CardEntity>> getNewCards(String deckId, int limit) {
    return (select(cards)
      ..where((tbl) => 
        tbl.deckId.equals(deckId) & 
        tbl.isDeleted.equals(false) &
        tbl.learningState.equals('NEW'))
      ..limit(limit))
        .get();
  }
  
  /// Insert or update card
  Future<int> upsertCard(CardsCompanion card) {
    return into(cards).insertOnConflictUpdate(card);
  }
  
  /// Batch upsert cards
  Future<void> upsertCards(List<CardsCompanion> cardsList) async {
    await batch((batch) {
      batch.insertAllOnConflictUpdate(cards, cardsList);
    });
  }
  
  /// Soft delete card
  Future<int> softDeleteCard(String id) {
    return (update(cards)..where((tbl) => tbl.id.equals(id)))
        .write(const CardsCompanion(isDeleted: Value(true)));
  }
  
  /// Get cards pending sync
  Future<List<CardEntity>> getCardsPendingSync() {
    return (select(cards)
      ..where((tbl) => tbl.syncStatus.equals(1)))
        .get();
  }
  
  /// Update card SRS data after review
  Future<int> updateCardSRS({
    required String cardId,
    required String learningState,
    required int interval,
    required int easeFactor,
    required int reviewCount,
    required String? nextReview,
    required String lastReviewed,
  }) {
    return (update(cards)..where((tbl) => tbl.id.equals(cardId))).write(
      CardsCompanion(
        learningState: Value(learningState),
        interval: Value(interval),
        easeFactor: Value(easeFactor),
        reviewCount: Value(reviewCount),
        nextReview: Value(nextReview),
        lastReviewed: Value(lastReviewed),
        localUpdatedAt: Value(DateTime.now().toIso8601String()),
        syncStatus: const Value(2), // Mark as Updated (for sync)
      ),
    );
  }

  // ==================== REVIEW LOG QUERIES ====================
  
  /// Insert review log entry
  Future<int> insertReviewLog(ReviewLogsCompanion logEntry) {
    return into(reviewLogs).insert(logEntry);
  }
  
  /// Get review history for a card
  Future<List<ReviewLogEntity>> getReviewHistoryForCard(String cardId, {int? limit}) {
    final query = select(reviewLogs)
      ..where((tbl) => tbl.cardId.equals(cardId))
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.reviewedAt)]);
    
    if (limit != null) {
      query.limit(limit);
    }
    
    return query.get();
  }
  
  /// Get review history for a deck
  Future<List<ReviewLogEntity>> getReviewHistoryForDeck(String deckId, {int? limit}) {
    final query = select(reviewLogs)
      ..where((tbl) => tbl.deckId.equals(deckId))
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.reviewedAt)]);
    
    if (limit != null) {
      query.limit(limit);
    }
    
    return query.get();
  }
  
  /// Get review logs pending sync
  Future<List<ReviewLogEntity>> getReviewLogsPendingSync() {
    return (select(reviewLogs)
      ..where((tbl) => tbl.syncStatus.equals(1)))
        .get();
  }
  
  /// Get review statistics for a time period
  Future<Map<String, int>> getReviewStats(String deckId, DateTime since) {
    // This would ideally use SQL aggregation, simplified for now
    // In production, use custom SQL query for better performance
    return transaction(() async {
      final logs = await (select(reviewLogs)
        ..where((tbl) => 
          tbl.deckId.equals(deckId) &
          tbl.reviewedAt.isBiggerOrEqualValue(since.toIso8601String())))
          .get();
      
      return {
        'total': logs.length,
        'again': logs.where((l) => l.rating == 0).length,
        'hard': logs.where((l) => l.rating == 2).length,
        'good': logs.where((l) => l.rating == 3).length,
        'easy': logs.where((l) => l.rating == 4).length,
      };
    });
  }
}

/// Database connection helper
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'flashcards.db'));
    
    // Configure SQLite for better performance
    if (Platform.isAndroid) {
      await applyWorkaroundToOpenSqlite3OnOldAndroidVersions();
    }
    
    final cachebase = (await getTemporaryDirectory()).path;
    sqlite3.tempDirectory = cachebase;
    
    return NativeDatabase.createInBackground(file);
  });
}
