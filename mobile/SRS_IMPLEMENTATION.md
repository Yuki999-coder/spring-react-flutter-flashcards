# 🧠 SRS Implementation - SM-2 Algorithm

## 📋 Overview

Complete implementation of the **Spaced Repetition System (SRS)** using the **SM-2 algorithm** for optimal flashcard scheduling.

**Completed**: January 20, 2026

---

## ✅ Implemented Features

### 1. **ReviewLog Table** (Database Schema)

New table for tracking review history and analytics:

**Location**: [lib/features/flashcard/data/datasources/local_db/app_database.dart](../lib/features/flashcard/data/datasources/local_db/app_database.dart)

**Schema**:
```dart
class ReviewLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get cardId => text().references(Cards, #id)();
  TextColumn get deckId => text().references(Decks, #id)();
  TextColumn get userId => text()();
  IntColumn get rating => integer()(); // 0=Again, 2=Hard, 3=Good, 4=Easy
  IntColumn get timeTakenSeconds => integer().nullable()();
  IntColumn get previousInterval => integer()();
  IntColumn get newInterval => integer()();
  IntColumn get previousEaseFactor => integer()();
  IntColumn get newEaseFactor => integer()();
  TextColumn get learningState => text()();
  TextColumn get reviewedAt => text()();
  IntColumn get syncStatus => integer().withDefault(const Constant(1))();
}
```

**Benefits**:
- 📊 **Analytics**: Track learning progress over time
- 🔄 **Sync**: Upload review history to server
- 📈 **Statistics**: Calculate accuracy, retention rates
- 🕐 **Time Tracking**: Measure review duration

**Database Migration**:
- Schema version: `1` → `2`
- Migration automatically creates `ReviewLogs` table

---

### 2. **SRSHelper Class** (Wrapper)

Simplified interface to the SM-2 algorithm:

**Location**: [lib/core/utils/srs_helper.dart](../lib/core/utils/srs_helper.dart)

**Usage**:
```dart
final helper = SRSHelper();

final result = helper.calculateNext(
  rating: 3, // Good
  currentInterval: 7,
  currentRepetitions: 2,
  currentEaseFactor: 2.5,
  currentLearningState: 'REVIEWING',
);

print(result.newInterval); // e.g., 17 days
print(result.newEaseFactor); // e.g., 2.5
print(result.newLearningState); // e.g., 'REVIEWING'
```

**Methods**:
- `calculateNext()` - Calculate new SRS values
- `calculateNextReviewDate()` - Get next review date
- `isDue()` - Check if card is due
- `getIntervalDescription()` - Human-readable interval
- `recommendGrade()` - Suggest grade based on time
- `getRatingLabel()` - Get button label (Lại/Khó/Tốt/Dễ)

---

### 3. **FlashcardRepository.saveReviewResult()** (Core Method)

**Single method** that handles everything:

**Location**: [lib/features/flashcard/domain/repositories/flashcard_repository.dart](../lib/features/flashcard/domain/repositories/flashcard_repository.dart)

**Signature**:
```dart
Future<Card> saveReviewResult({
  required Card card,
  required int rating, // 0=Again, 2=Hard, 3=Good, 4=Easy
  int? timeTakenSeconds,
});
```

**What it does**:
1. ✅ Calculate new SRS values using SM-2 algorithm
2. ✅ Update card in database (interval, easeFactor, reviewCount, nextReview)
3. ✅ Set `syncStatus = 2` (Updated) → **Triggers sync**
4. ✅ Log review to `ReviewLog` table
5. ✅ Return updated card entity

**Implementation**: [lib/features/flashcard/data/repositories/flashcard_repository_impl.dart](../lib/features/flashcard/data/repositories/flashcard_repository_impl.dart)

---

### 4. **ReviewProvider Integration**

**Updated**: [lib/features/flashcard/presentation/providers/review_provider.dart](../lib/features/flashcard/presentation/providers/review_provider.dart)

**Before** (Old way):
```dart
// Old: Manual SRS calculation + separate updateCardSRS call
final result = SRSAlgorithm.calculateNext(...);
await repository.updateCardSRS(...); // No logging
```

**After** (New way):
```dart
// New: Single method handles everything
await repository.saveReviewResult(
  card: card,
  rating: grade.value,
  timeTakenSeconds: timeTaken, // Optional
);
```

**Benefits**:
- ✅ Cleaner code (less boilerplate)
- ✅ Automatic review logging
- ✅ Time tracking support
- ✅ Sync status automatically updated

---

### 5. **Time Tracking** (ReviewScreen)

**Updated**: [lib/features/flashcard/presentation/pages/review_screen.dart](../lib/features/flashcard/presentation/pages/review_screen.dart)

**How it works**:
```dart
class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  DateTime? _cardShownAt; // Track when card was shown

  @override
  void initState() {
    super.initState();
    _cardShownAt = DateTime.now(); // Start timer
  }

  void _submitReview(Grade grade, domain.Card card) {
    // Calculate time taken
    int? timeTaken;
    if (_cardShownAt != null) {
      timeTaken = DateTime.now().difference(_cardShownAt!).inSeconds;
    }

    // Save review with time tracking
    ref.read(reviewSessionProvider(widget.deck.id).notifier).reviewCard(
      cardId: card.id,
      grade: grade,
      timeTakenSeconds: timeTaken, // ← NEW
    );

    // Restart timer for next card
    _cardShownAt = DateTime.now();
  }
}
```

**Benefits**:
- 📊 Analytics: Average time per card
- 🤖 AI Recommendations: Suggest grade based on time
- 📈 Progress Tracking: Identify difficult cards

---

## 🔄 Complete Flow: Review a Card

```
1. User sees card in ReviewScreen
   ↓
   _cardShownAt = DateTime.now()  // Start timer

2. User flips card (tap)
   ↓
   _isFlipped = true

3. User selects grade (swipe or button)
   ↓
   Grade: Again (0), Hard (2), Good (3), or Easy (4)

4. Calculate time taken
   ↓
   timeTaken = now - _cardShownAt (seconds)

5. Call ReviewProvider.reviewCard()
   ↓
   rating = grade.value
   timeTakenSeconds = timeTaken

6. Repository.saveReviewResult()
   ↓
   ├─ SRSHelper.calculateNext()
   │  ├─ Input: rating, currentInterval, currentEaseFactor
   │  └─ Output: newInterval, newEaseFactor, newLearningState
   ↓
   ├─ Database.updateCardSRS()
   │  ├─ Update: interval, easeFactor, reviewCount
   │  ├─ Update: nextReview, lastReviewed
   │  └─ Update: syncStatus = 2 (UPDATED) ← Sync trigger
   ↓
   └─ Database.insertReviewLog()
      ├─ Log: cardId, rating, timeTaken
      ├─ Log: previousInterval → newInterval
      ├─ Log: previousEaseFactor → newEaseFactor
      └─ Log: reviewedAt timestamp

7. Remove card from session
   ↓
   Show next card or "Complete" screen

8. Next sync will upload:
   ↓
   ├─ Updated card (syncStatus = 2)
   └─ Review log (syncStatus = 1)
```

---

## 🧮 SM-2 Algorithm Details

### **Rating → Interval Calculation**

| Rating | Value | Action | Interval Formula | Ease Factor Change |
|--------|-------|--------|------------------|-------------------|
| **Again** | 0 | Reset | `1 day` | `EF - 0.2` (min: 1.3) |
| **Hard** | 2 | Minimal growth | `interval × 1.2` | `EF - 0.15` |
| **Good** | 3 | Standard growth | `interval × EF` | No change |
| **Easy** | 4 | Accelerated growth | `interval × EF × 1.3` | `EF + 0.15` |

### **Example Progression**

**Card starts**: `interval=0, EF=2.5, state=NEW`

| Review # | Rating | New Interval | New EF | Next Review Date |
|----------|--------|--------------|--------|------------------|
| 1 | Good | 1 day | 2.5 | Tomorrow |
| 2 | Good | 3 days | 2.5 | Jan 23 |
| 3 | Easy | 10 days | 2.65 | Feb 2 |
| 4 | Good | 26 days | 2.65 | Feb 28 |
| 5 | Hard | 31 days | 2.5 | Mar 31 |

**If user selects "Again"**:
- Interval resets to `1 day`
- EF becomes `2.3` (2.5 - 0.2)
- State changes to `RELEARNING`

---

## 🔐 Sync Integration

### **syncStatus Values**

| Value | Status | Meaning |
|-------|--------|---------|
| 0 | **Synced** | In sync with server |
| 1 | **Pending** | Never synced (new) |
| 2 | **Updated** | Local changes need sync |

### **What Triggers Sync**

✅ **Card Updated**:
```dart
await _database.updateCardSRS(
  cardId: cardId,
  ...
  syncStatus: const Value(2), // ← UPDATED
);
```

✅ **Review Log Created**:
```dart
await _database.insertReviewLog(
  ReviewLogsCompanion.insert(
    ...
    syncStatus: 1, // ← PENDING (new)
  ),
);
```

### **Next Sync Will Upload**

```dart
// Get cards with changes
final cardsToSync = await getCardsPendingSync();
// Returns cards where syncStatus IN (1, 2)

// Get review logs to upload
final logsToSync = await getReviewLogsPendingSync();
// Returns logs where syncStatus = 1
```

---

## 📊 Database Queries Added

**Location**: [lib/features/flashcard/data/datasources/local_db/app_database.dart](../lib/features/flashcard/data/datasources/local_db/app_database.dart)

### **ReviewLog Queries**

```dart
// Insert review log
Future<int> insertReviewLog(ReviewLogsCompanion logEntry)

// Get review history for a card
Future<List<ReviewLogEntity>> getReviewHistoryForCard(String cardId, {int? limit})

// Get review history for a deck
Future<List<ReviewLogEntity>> getReviewHistoryForDeck(String deckId, {int? limit})

// Get logs pending sync
Future<List<ReviewLogEntity>> getReviewLogsPendingSync()

// Get statistics for a time period
Future<Map<String, int>> getReviewStats(String deckId, DateTime since)
```

### **Example Usage**

```dart
// Get last 10 reviews for a card
final history = await db.getReviewHistoryForCard(cardId, limit: 10);

// Get today's deck stats
final stats = await db.getReviewStats(
  deckId,
  DateTime.now().subtract(Duration(days: 1)),
);

print(stats); // { total: 15, again: 2, hard: 3, good: 8, easy: 2 }
```

---

## 🧪 Testing Guide

### **1. Test SRS Calculation**

```dart
import 'package:flashcards_mobile/core/utils/srs_helper.dart';

void testSRS() {
  final helper = SRSHelper();

  // Test "Good" rating
  final result = helper.calculateNext(
    rating: 3,
    currentInterval: 7,
    currentRepetitions: 2,
    currentEaseFactor: 2.5,
    currentLearningState: 'REVIEWING',
  );

  assert(result.newInterval == 17); // 7 × 2.5 = 17.5 ≈ 18
  assert(result.newEaseFactor == 2.5); // No change
  assert(result.newLearningState == 'REVIEWING');
}
```

### **2. Test Review Flow**

**Steps**:
1. Create a deck with 3 cards
2. Tap "Học ngay" to start review
3. Review cards with different ratings:
   - Card 1: **Good** (expect ~3 day interval)
   - Card 2: **Again** (expect 1 day interval)
   - Card 3: **Easy** (expect ~8 day interval)
4. Check database after each review

**Verify Database**:
```sql
-- Check card updates
SELECT id, interval, easeFactor, reviewCount, nextReview, syncStatus
FROM Cards
WHERE deckId = '<deck-id>';

-- Check review logs
SELECT cardId, rating, timeTakenSeconds, previousInterval, newInterval
FROM ReviewLogs
WHERE deckId = '<deck-id>'
ORDER BY reviewedAt DESC;
```

**Expected**:
- ✅ `syncStatus = 2` on all reviewed cards
- ✅ 3 entries in `ReviewLogs` table
- ✅ `timeTakenSeconds` populated
- ✅ `nextReview` dates calculated correctly

### **3. Test Sync Trigger**

```dart
// Get cards pending sync
final cardsToSync = await repository.getCardsPendingSync();

// Should return cards with syncStatus = 2 (Updated)
assert(cardsToSync.isNotEmpty);
assert(cardsToSync.every((c) => c.syncStatus == 2));
```

---

## 📈 Analytics Possibilities

With `ReviewLog` table, you can now:

### **Performance Metrics**
```dart
// Average time per card
final avgTime = logs.map((l) => l.timeTakenSeconds).average;

// Accuracy rate
final accuracy = logs.where((l) => l.rating >= 3).length / logs.length;

// Difficult cards (many "Again" ratings)
final hardCards = groupBy(logs, (l) => l.cardId)
  .entries
  .where((e) => e.value.where((l) => l.rating == 0).length > 2);
```

### **Progress Tracking**
```dart
// Reviews per day
final reviewsToday = logs.where((l) => 
  DateTime.parse(l.reviewedAt).isAfter(DateTime.now().subtract(Duration(days: 1)))
).length;

// Interval growth over time
final intervalProgression = logs
  .map((l) => {'date': l.reviewedAt, 'interval': l.newInterval})
  .toList();
```

---

## 🚀 Next Steps (Phase 7)

### **SyncService Implementation**

**Upload Review Logs**:
```dart
final logsToSync = await database.getReviewLogsPendingSync();

await api.post('/v1/sync/reviews', data: {
  'reviews': logsToSync.map((l) => {
    'cardId': l.cardId,
    'rating': l.rating,
    'timeTaken': l.timeTakenSeconds,
    'previousInterval': l.previousInterval,
    'newInterval': l.newInterval,
    'reviewedAt': l.reviewedAt,
  }).toList(),
});

// Mark as synced
await database.updateReviewLogSyncStatus(logs, syncStatus: 0);
```

### **Advanced Features**
- **Heatmap**: Show review activity calendar
- **Retention Curve**: Plot memory retention over time
- **Difficulty Analysis**: Identify problematic cards
- **Study Recommendations**: AI-powered study plan

---

## ✅ Completion Checklist

- [x] ReviewLog table added to schema
- [x] Database migration (v1 → v2)
- [x] SRSHelper wrapper class
- [x] saveReviewResult() method in repository
- [x] ReviewProvider updated to use new method
- [x] Time tracking in ReviewScreen
- [x] syncStatus = 2 set on review
- [x] Review log insertion
- [x] Code generation successful
- [x] Zero compilation errors

---

**Last Updated**: January 20, 2026  
**Database Version**: 2  
**Files Modified**: 5  
**Lines Added**: ~350
