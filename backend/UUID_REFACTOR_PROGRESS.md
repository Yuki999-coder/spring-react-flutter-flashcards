# UUID Refactor Progress Tracker

## ✅ Entities Refactored (100%)

1. ✅ BaseEntity - Created with UUID, Instant timestamps, soft delete
2. ✅ User - UUID id, audit fields from BaseEntity  
3. ✅ Folder - UUID id + userId, Instant timestamps
4. ✅ Deck - UUID id + userId + folderId
5. ✅ Card - UUID id + deckId
6. ✅ CardProgress - UUID id + userId + cardId
7. ✅ StudyLog - UUID id + userId + cardId
8. ✅ StudySession - UUID id + userId + deckId
9. ✅ TestResult - UUID id + userId + deckId

## 🔄 Repositories (In Progress)

### Changed:
- ✅ UserRepository - `JpaRepository<User, UUID>`

### TODO:
- ⏳ FolderRepository
- ⏳ DeckRepository  
- ⏳ CardRepository
- ⏳ CardProgressRepository
- ⏳ StudyLogRepository
- ⏳ StudySessionRepository
- ⏳ TestResultRepository

## ⏰ DTOs (Not Started)

### Request DTOs:
- CreateDeckRequest
- UpdateDeckRequest
- CreateCardRequest
- UpdateCardRequest
- CreateFolderRequest
- UpdateFolderRequest
- RecordProgressRequest
- ReviewRequest
- SyncPushRequest (already has UUID support)
- Others...

### Response DTOs:
- DeckResponse
- CardResponse
- FolderResponse
- SyncDataResponse (needs UUID updates)
- Others...

## ⏰ Services (Not Started)

All service methods need UUID parameter types

## ⏰ Controllers (Not Started)

All @PathVariable and @RequestParam need UUID types

## 📝 Notes

### Key Changes:
- `Long id` → `UUID id`
- `LocalDateTime` → `Instant`
- `is_deleted Boolean` → `deleted_at Instant`
- All FK columns need `columnDefinition = "uuid"`

### Database:
- Set `spring.jpa.hibernate.ddl-auto=create-drop` locally
- PostgreSQL will auto-create UUID columns
- No migration needed for dev (fresh start)

### Breaking Changes:
- All API endpoints accept UUID strings instead of numeric IDs
- Frontend needs to handle UUID format
- Mobile app can generate UUIDs locally
