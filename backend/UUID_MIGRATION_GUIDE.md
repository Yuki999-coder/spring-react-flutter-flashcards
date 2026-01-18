# UUID Migration Guide

## ✅ COMPLETED WORK

### 1. Entities (9/9) ✅
- [x] BaseEntity created with UUID + Instant timestamps + soft delete
- [x] User, Folder, Deck, Card, CardProgress, StudyLog, StudySession, TestResult
- [x] All entities extend BaseEntity
- [x] Soft delete: `Boolean isDeleted` → `Instant deletedAt`
- [x] Timestamps: `LocalDateTime` → `Instant`

### 2. Repositories (8/8) ✅
- [x] UserRepository, FolderRepository, DeckRepository, CardRepository
- [x] CardProgressRepository, StudyLogRepository, StudySessionRepository, TestResultRepository
- [x] All `JpaRepository<Entity, Long>` → `JpaRepository<Entity, UUID>`
- [x] All method parameters: `Long` → `UUID`
- [x] Native queries: Added `CAST(:param AS uuid)`
- [x] Removed manual `is_deleted = false` checks (handled by @Where)

### 3. Configuration ✅
- [x] application.properties: `spring.jpa.hibernate.ddl-auto=create-drop`

### 4. Sync DTOs ✅
- [x] SyncDataResponse: All Long IDs → String (UUID serialized)
- [x] SyncPushRequest: All Long IDs → String (mobile-generated UUIDs)
- [x] All `LocalDateTime` → `Instant`

---

## 🔧 COMPILATION ERRORS TO FIX

Based on `mvn clean compile` output, here are systematic patterns:

### Pattern 1: UUID ↔ String Conversion

**DTO → Entity (Sync Push):**
```java
// ❌ OLD (causes error)
deck.setId(data.getId());  // String → UUID won't auto-convert

// ✅ NEW
UUID id = data.getId() != null ? UUID.fromString(data.getId()) : UUID.randomUUID();
deck.setId(id);
```

**Entity → DTO (Sync Pull):**
```java
// ❌ OLD
.id(entity.getId())  // UUID → String won't auto-convert

// ✅ NEW
.id(entity.getId().toString())
```

### Pattern 2: Soft Delete Changes

**Setting Deleted State:**
```java
// ❌ OLD (method no longer exists)
entity.setIsDeleted(true);
entity.setIsDeleted(data.getIsDeleted());

// ✅ NEW
entity.softDelete();  // Sets deletedAt = now()
entity.setDeletedAt(data.getDeletedAt());  // From sync data
```

**Checking Deleted State:**
```java
// ❌ OLD
if (entity.getIsDeleted()) { ... }
if (!deck.getIsDeleted()) { ... }

// ✅ NEW
if (entity.isDeleted()) { ... }  // Checks deletedAt != null
if (!deck.isDeleted()) { ... }
```

### Pattern 3: LocalDateTime → Instant

**Repository/Service Calls:**
```java
// ❌ OLD
LocalDateTime now = LocalDateTime.now();
repo.findByDateRange(userId, startDate, endDate);  // LocalDateTime params

// ✅ NEW
Instant now = Instant.now();
repo.findByDateRange(userId, startDate, endDate);  // Instant params
```

**DTO Mapping:**
```java
// ❌ OLD
.createdAt(LocalDateTime.now())
.nextReview(LocalDateTime.now().plusDays(1))

// ✅ NEW
.createdAt(Instant.now())
.nextReview(Instant.now().plus(1, ChronoUnit.DAYS))
```

### Pattern 4: List<Long> → Iterable<UUID>

**FindAllById calls:**
```java
// ❌ OLD
List<Long> ids = Arrays.asList(1L, 2L, 3L);
List<Card> cards = cardRepository.findAllById(ids);  // Type mismatch

// ✅ NEW
List<UUID> ids = request.getCardIds().stream()
    .map(UUID::fromString)  // If from String DTOs
    .collect(Collectors.toList());
List<Card> cards = cardRepository.findAllById(ids);
```

### Pattern 5: Response DTO Mappings

**CardResponse, DeckResponse, etc.:**
```java
// ❌ OLD
CardResponse.builder()
    .id(card.getId())  // UUID won't serialize properly
    .deckId(card.getDeckId())
    .createdAt(card.getCreatedAt())  // Instant might need conversion
    .build();

// ✅ NEW (Two options)

// Option A: Keep UUID in DTO, Jackson will auto-serialize to String
CardResponse.builder()
    .id(card.getId())  // If DTO field is UUID type
    .deckId(card.getDeckId())
    .createdAt(card.getCreatedAt())
    .build();

// Option B: Manual String conversion
CardResponse.builder()
    .id(card.getId().toString())  // If DTO field is String type
    .deckId(card.getDeckId().toString())
    .createdAt(card.getCreatedAt())
    .build();
```

---

## 📋 FILES NEEDING MANUAL FIXES

Based on compiler errors, fix in this order:

### **CRITICAL PATH (Sync & Core Services)**

1. **SyncService.java** (~40 errors)
   - Import `UUID`, `Instant`, `ChronoUnit`
   - Change `pullData(Long userId, LocalDateTime lastSyncTime)` → `pullData(UUID userId, Instant lastSyncTime)`
   - All `List<Long> deckIds` → `List<UUID> deckIds`
   - String → UUID conversion: `UUID.fromString(data.getId())`
   - UUID → String conversion: `entity.getId().toString()`
   - `getIsDeleted()` → `getDeletedAt()`
   - `setIsDeleted()` → `setDeletedAt()`
   - Mapping methods: All `.id()` → `.id(entity.getId().toString())`

2. **SyncController.java** (~10 errors)
   - Import `UUID`, `Instant`
   - `@PathVariable Long userId` → `@PathVariable UUID userId`
   - `@RequestParam LocalDateTime lastSyncTime` → `@RequestParam Instant lastSyncTime`
   - Service calls updated

3. **CardService.java** (~60 errors)
   - All method signatures: `Long id/userId/deckId` → `UUID id/userId/deckId`
   - `List<Long> cardIds` → `List<UUID> cardIds`
   - Response mappings: `.id(card.getId().toString())`
   - `setIsDeleted()` → `softDelete()` or `setDeletedAt()`
   - `LocalDateTime` → `Instant` throughout

4. **ReviewService.java** (~20 errors)
   - Method signatures: `Long` → `UUID`
   - `LocalDateTime` → `Instant` for study logs
   - DTO mappings updated

5. **StudySessionService.java** (~25 errors)
   - Method signatures: `Long` → `UUID`
   - `LocalDateTime` → `Instant` for start/end times
   - Repository calls updated

6. **ImportExportService.java** (~10 errors)
   - Deck/Card ID conversions: `Long` → `UUID`
   - Repository calls updated

### **Response DTOs** (~8 files)

Need to decide: **UUID field type or String field type?**

**Recommendation: Use String in DTOs** (easier for frontend):

```java
// CardResponse.java
private String id;  // Was: Long id
private String deckId;  // Was: Long deckId
private Instant createdAt;  // Was: LocalDateTime createdAt
```

Files to update:
- CardResponse.java
- DeckResponse.java
- FolderResponse.java
- ReviewResponse.java (old location)
- response/ReviewResponse.java (new location)
- StudySessionResponse.java
- TestResultResponse.java
- AuthResponse.java (userId field)
- DueCardsSummaryResponse.java

### **Request DTOs** (~12 files)

Change `Long id/deckId/folderId` → `String id/deckId/folderId`:

- CreateCardRequest.java → `private String deckId;`
- UpdateCardRequest.java → `private String id;`
- CreateDeckRequest.java → `private String folderId;` (nullable)
- UpdateDeckRequest.java → `private String id;`
- UpdateFolderRequest.java → `private String id;`
- ReorderCardsRequest.java → `private List<String> cardIds;`
- ReviewRequest.java → `private String cardId;`
- RecordProgressRequest.java → `private String cardId;`
- CreateStudySessionRequest.java → `private String deckId;`
- CreateTestResultRequest.java → `private String deckId;`
- ImportCardsRequest.java → (check for ID fields)
- BulkCreateCardsRequest.java → `private String deckId;`

### **Controllers** (~8 files)

```java
// ❌ OLD
@GetMapping("/{id}")
public ResponseEntity<DeckResponse> getDeck(@PathVariable Long id) { ... }

// ✅ NEW - Spring auto-converts String to UUID
@GetMapping("/{id}")
public ResponseEntity<DeckResponse> getDeck(@PathVariable UUID id) { ... }
```

Files to update:
- CardController.java
- DeckController.java
- FolderController.java
- ReviewController.java (already has errors)
- StudyController.java
- StudySessionController.java
- TestResultController.java
- SyncController.java (already done in SyncService)

---

## 🔍 SELF-REVIEW CHECKLIST

Before marking migration complete, search for:

```bash
# In backend/src/main/java directory

# ❌ Should find ZERO matches
grep -r "Long id" --include="*.java"
grep -r "Long userId" --include="*.java"
grep -r "Long deckId" --include="*.java"
grep -r "Long cardId" --include="*.java"
grep -r "Long folderId" --include="*.java"
grep -r "LocalDateTime createdAt" --include="*.java"
grep -r "LocalDateTime updatedAt" --include="*.java"
grep -r "getIsDeleted()" --include="*.java"
grep -r "setIsDeleted(" --include="*.java"
grep -r "isDeleted = false" --include="*.java"
grep -r "is_deleted" --include="*.java"

# ✅ Should find MANY matches
grep -r "UUID id" --include="*.java"
grep -r "Instant createdAt" --include="*.java"
grep -r "getDeletedAt()" --include="*.java"
grep -r "deleted_at IS NULL" --include="*.java"
```

---

## 🚀 COMPILATION TEST

After all fixes:

```bash
cd backend
mvn clean compile -DskipTests
```

If successful, proceed to:

```bash
mvn clean test  # Run all tests
```

---

## 📝 API CHANGES (Breaking Changes)

### Before (Long IDs):
```json
GET /api/v1/decks/123
{
  "id": 123,
  "userId": 456,
  "folderId": 789,
  "title": "Vocabulary",
  "createdAt": "2024-01-15T10:30:00"
}
```

### After (UUID Strings):
```json
GET /api/v1/decks/550e8400-e29b-41d4-a716-446655440000
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "folderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Vocabulary",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Note:** 
- All numeric IDs → UUID strings
- Timestamps now in ISO-8601 UTC format (ends with Z)

---

## 🗄️ DATABASE MIGRATION

**CRITICAL:** `spring.jpa.hibernate.ddl-auto=create-drop` will **DELETE ALL DATA** on restart.

### Before First Run:
```sql
-- Backup existing data if needed
pg_dump -U username -d database > backup_before_uuid.sql
```

### After UUID Migration Complete:
```properties
# Change back to update mode
spring.jpa.hibernate.ddl-auto=update
```

---

## 🔄 FRONTEND MIGRATION TASKS

1. **API Client Updates:**
   - All ID parameters: `number` → `string`
   - UUID validation regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

2. **TypeScript Interfaces:**
   ```typescript
   // ❌ OLD
   interface Deck {
     id: number;
     userId: number;
     folderId: number;
     createdAt: string;
   }

   // ✅ NEW
   interface Deck {
     id: string;  // UUID as string
     userId: string;
     folderId: string | null;
     createdAt: string;  // ISO-8601 UTC
   }
   ```

3. **React Router Paths:**
   ```typescript
   // ❌ OLD
   <Route path="/decks/:id" />  // :id expected number

   // ✅ NEW
   <Route path="/decks/:id" />  // :id now UUID string
   ```

4. **Local Storage / IndexedDB:**
   - If storing IDs, update to UUIDs
   - Clear existing cached data

---

## 📱 MOBILE APP MIGRATION

### Offline-First Benefits (Why UUID):

1. **Generate IDs Offline:**
   ```dart
   // Mobile can create UUIDs without server
   import 'package:uuid/uuid.dart';
   
   final uuid = Uuid();
   String newCardId = uuid.v4();  // Conflict-free!
   ```

2. **Sync Without Conflicts:**
   ```dart
   // Mobile creates card offline
   Card card = Card(
     id: uuid.v4(),  // Generated locally
     deckId: existingDeckUuid,
     term: "Hello",
     createdAt: DateTime.now().toUtc(),
   );
   
   // Later, sync to server (no ID collision)
   await syncService.pushChanges([card]);
   ```

---

## 🎯 ESTIMATED COMPLETION TIME

| Task | Estimated Time | Status |
|------|----------------|--------|
| Entities | 30 min | ✅ DONE |
| Repositories | 45 min | ✅ DONE |
| Sync DTOs | 15 min | ✅ DONE |
| Config | 5 min | ✅ DONE |
| SyncService | 30 min | ⏳ TODO |
| CardService | 45 min | ⏳ TODO |
| Other Services | 60 min | ⏳ TODO |
| Response DTOs | 30 min | ⏳ TODO |
| Request DTOs | 30 min | ⏳ TODO |
| Controllers | 45 min | ⏳ TODO |
| Compilation Test | 15 min | ⏳ TODO |
| Self-Review | 15 min | ⏳ TODO |
| **TOTAL** | **~5.5 hours** | **~35% Done** |

---

## 💡 QUICK REFERENCE

### Common Import Additions:
```java
import java.util.UUID;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.stream.Collectors;
```

### Common UUID Operations:
```java
// String → UUID
UUID id = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

// UUID → String
String idStr = uuid.toString();

// Generate new UUID
UUID newId = UUID.randomUUID();

// Nullable UUID from String
UUID id = idStr != null ? UUID.fromString(idStr) : null;
```

### Common Instant Operations:
```java
// Current time
Instant now = Instant.now();

// Add duration
Instant tomorrow = now.plus(1, ChronoUnit.DAYS);
Instant nextWeek = now.plus(7, ChronoUnit.DAYS);

// Comparison
if (instant1.isAfter(instant2)) { ... }
if (instant1.isBefore(Instant.now())) { ... }

// For sync point (epoch)
Instant epoch = Instant.ofEpochMilli(0);  // 1970-01-01T00:00:00Z
```

---

**Status:** Migration 35% complete. Entity and Repository layers fully refactored. Service, DTO, and Controller layers pending.

**Next Steps:** Fix compilation errors in Services → DTOs → Controllers, then run full compilation test.
