# Sync API Implementation Summary

## ✅ Hoàn thành

Đã thiết kế và implement đầy đủ **Sync API** cho mobile app offline-first (giống Anki).

---

## 📁 Files đã tạo/thay đổi

### 1. DTOs (Data Transfer Objects)

#### `SyncDataResponse.java`
- **Location**: `backend/src/main/java/com/flashcards/dto/response/`
- **Purpose**: DTO cho Pull API response
- **Chứa**:
  - `DeckSyncData` - Deck entity với timestamps
  - `CardSyncData` - Card entity với timestamps
  - `StudyLogSyncData` - Study log với reviewedAt
  - `CardProgressSyncData` - SRS progress với timestamps
  - `FolderSyncData` - Folder entity với timestamps

#### `SyncPushRequest.java`
- **Location**: `backend/src/main/java/com/flashcards/dto/request/`
- **Purpose**: DTO cho Push API request
- **Chứa**:
  - `DeckPushData` - Deck changes từ mobile
  - `CardPushData` - Card changes từ mobile
  - `StudyLogPushData` - Study log từ mobile
  - `CardProgressPushData` - SRS progress từ mobile
  - `FolderPushData` - Folder changes từ mobile

### 2. Service Layer

#### `SyncService.java`
- **Location**: `backend/src/main/java/com/flashcards/service/`
- **Chức năng**:
  
  **Pull Data** (`pullData(userId, lastSyncTime)`):
  - Query tất cả entities có `updatedAt > lastSyncTime`
  - Filter theo userId (security)
  - Trả về DeckSyncData, CardSyncData, StudyLogSyncData, CardProgressSyncData, FolderSyncData
  - Bao gồm soft-deleted items để mobile sync
  
  **Push Data** (`pushData(userId, request)`):
  - Nhận changes từ mobile
  - `id = null`: Create new entity
  - `id != null`: Update existing entity
  - Validate ownership trước khi save
  - Return server timestamp

### 3. Controller Layer

#### `SyncController.java`
- **Location**: `backend/src/main/java/com/flashcards/controller/`
- **Endpoints**:

  1. **GET /api/v1/sync**
     - Pull changes từ server
     - Query param: `lastSyncTime` (optional)
     - Response: `SyncDataResponse`
  
  2. **POST /api/v1/sync**
     - Push changes lên server
     - Body: `SyncPushRequest`
     - Response: `SyncDataResponse` với serverTime
  
  3. **GET /api/v1/sync/time**
     - Get current server timestamp
     - Response: `LocalDateTime`

### 4. Documentation

#### `SYNC_API.md`
- **Location**: `backend/`
- **Nội dung**:
  - API Overview
  - Endpoint documentation với examples
  - Data models (TypeScript-style)
  - Sync workflow (Mobile client)
  - Conflict resolution strategy
  - Security & validation
  - Testing guides (curl/Postman)
  - Mobile implementation notes (Flutter/SQLite)
  - Performance tips

### 5. Test Scripts

#### `test-sync-api.sh`
- **Location**: `backend/`
- **Purpose**: Bash script để test API trên Linux/Mac
- **Steps**:
  1. Login → Get JWT token
  2. Get server time
  3. Pull all data (first sync)
  4. Push new deck/card
  5. Pull delta changes

#### `test-sync-api.ps1`
- **Location**: `backend/`
- **Purpose**: PowerShell script để test API trên Windows
- **Tương tự như bash script**

---

## 🔧 Cấu trúc API

### Pull API (Download từ server)

```http
GET /api/v1/sync?lastSyncTime=2024-01-15T10:30:00
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "serverTime": "2024-01-16T14:25:30",
  "folders": [...],
  "decks": [...],
  "cards": [...],
  "studyLogs": [...],
  "cardProgress": [...]
}
```

### Push API (Upload lên server)

```http
POST /api/v1/sync
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "decks": [
    { "id": null, "title": "New Deck", ... }
  ],
  "cards": [
    { "id": null, "deckId": 1, "term": "Hello", ... }
  ],
  ...
}
```

**Response**:
```json
{
  "serverTime": "2024-01-16T14:30:00",
  "folders": [],
  "decks": [],
  "cards": [],
  "studyLogs": [],
  "cardProgress": []
}
```

---

## 🔐 Security Features

1. **JWT Authentication**: Tất cả endpoints require Bearer token
2. **Ownership Validation**: 
   - User chỉ có thể sync dữ liệu của chính mình
   - Validate deck ownership khi push cards
   - Validate folder ownership khi push decks
3. **SQL Injection Prevention**: Sử dụng JPA repositories
4. **Soft Delete Support**: Include deleted items trong sync để mobile có thể cleanup

---

## ⚡ Performance Optimizations

1. **Delta Sync**: Chỉ trả về entities thay đổi sau `lastSyncTime`
2. **Stream API**: Sử dụng Java Streams để filter efficiently
3. **Lazy Loading**: Entities không load relationships không cần thiết
4. **Recommended Indexes** (trong SYNC_API.md):
   ```sql
   CREATE INDEX idx_decks_updated_at ON decks(updated_at);
   CREATE INDEX idx_cards_updated_at ON cards(updated_at);
   CREATE INDEX idx_card_progress_updated_at ON card_progress(updated_at);
   CREATE INDEX idx_study_log_reviewed_at ON study_log(reviewed_at);
   CREATE INDEX idx_folders_updated_at ON folders(updated_at);
   ```

---

## 📊 Sync Workflow (Mobile)

### First Sync
```
1. Mobile: GET /api/v1/sync (no lastSyncTime)
2. Server: Return ALL user data
3. Mobile: Save to SQLite
4. Mobile: Store serverTime as lastSyncTime
```

### Subsequent Sync (Bidirectional)
```
1. PUSH Phase:
   - Collect local changes (dirty flag)
   - POST /api/v1/sync
   - Clear dirty flags

2. PULL Phase:
   - GET /api/v1/sync?lastSyncTime={stored_time}
   - Apply server changes to SQLite
   - Update lastSyncTime = serverTime
```

### Conflict Resolution
- **Strategy**: Last-Write-Wins (LWW)
- Server ưu tiên `updatedAt` mới nhất
- Mobile pull sau khi push để nhận latest state

---

## 🧪 Testing

### Build & Compile

```bash
cd backend
mvn clean compile -DskipTests
```

**Status**: ✅ BUILD SUCCESS

### Run Test Scripts

**Linux/Mac**:
```bash
chmod +x test-sync-api.sh
./test-sync-api.sh
```

**Windows PowerShell**:
```powershell
.\test-sync-api.ps1
```

### Manual Testing với curl

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' \
  | jq -r '.token')

# 2. Pull all data
curl -X GET "http://localhost:8080/api/v1/sync" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 3. Pull delta
curl -X GET "http://localhost:8080/api/v1/sync?lastSyncTime=2024-01-15T10:30:00" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 4. Push changes
curl -X POST "http://localhost:8080/api/v1/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decks": [{"id": null, "title": "Test Deck", "sourceType": "LOCAL", "isDeleted": false}]
  }' | jq '.'
```

---

## 📝 Implementation Notes

### Entities có `updatedAt` field

Tất cả entities đã có `@UpdateTimestamp`:
- ✅ `Deck` - updatedAt
- ✅ `Card` - updatedAt
- ✅ `CardProgress` - updatedAt
- ✅ `Folder` - updatedAt
- ✅ `StudyLog` - reviewedAt (CreationTimestamp)

### Folder Entity

**Note**: Folder entity **không có** field `color` trong database hiện tại.

**Giải pháp hiện tại**:
- `SyncDataResponse.FolderSyncData.color` = `null`
- Comment trong `SyncService.saveFolderFromPush()` để skip `setColor()`

**Để implement color trong tương lai**:
1. Thêm migration script:
   ```sql
   ALTER TABLE folders ADD COLUMN color VARCHAR(20);
   ```
2. Update `Folder.java`:
   ```java
   @Column(length = 20)
   private String color;
   ```
3. Uncomment dòng `folder.setColor()` trong `SyncService`

---

## 🚀 Next Steps (Cho Mobile Team)

### Flutter Implementation Checklist

1. **Create Local Database (SQLite)**
   ```dart
   CREATE TABLE decks (
     id INTEGER PRIMARY KEY,
     title TEXT,
     ...,
     updated_at TEXT,
     is_dirty INTEGER DEFAULT 0
   )
   ```

2. **Add Sync Service**
   ```dart
   class SyncService {
     Future<void> syncWithServer() async {
       await pushLocalChanges();
       await pullServerChanges();
     }
   }
   ```

3. **Implement API Client**
   ```dart
   class SyncApiClient {
     Future<SyncDataResponse> pullData(String? lastSyncTime);
     Future<SyncDataResponse> pushData(SyncPushRequest);
   }
   ```

4. **Add Conflict Resolution**
   - Last-Write-Wins strategy
   - Compare `updatedAt` timestamps

5. **Background Sync**
   - Use WorkManager (Android) / BackgroundFetch (iOS)
   - Sync khi có internet connection

### Recommended Flutter Packages

- `sqflite` - SQLite database
- `dio` - HTTP client
- `connectivity_plus` - Network status
- `workmanager` - Background tasks

---

## 📚 Documentation

Chi tiết đầy đủ xem tại: **`backend/SYNC_API.md`**

Bao gồm:
- API endpoints với request/response examples
- Data models (TypeScript-style)
- Security & validation rules
- Testing guides (Postman/curl)
- Mobile implementation guide (Flutter/SQLite)
- Performance tips
- Conflict resolution strategies

---

## ✅ Summary

**API Endpoints**:
1. ✅ `GET /api/v1/sync` - Pull changes
2. ✅ `POST /api/v1/sync` - Push changes
3. ✅ `GET /api/v1/sync/time` - Get server time

**Features**:
- ✅ Bidirectional sync (Pull + Push)
- ✅ Delta sync based on `updatedAt`
- ✅ Security validation (ownership)
- ✅ Soft delete support
- ✅ Last-Write-Wins conflict resolution
- ✅ JWT authentication

**Files Created**:
- ✅ SyncDataResponse.java (DTO)
- ✅ SyncPushRequest.java (DTO)
- ✅ SyncService.java (Business logic)
- ✅ SyncController.java (REST endpoints)
- ✅ SYNC_API.md (Documentation)
- ✅ test-sync-api.sh (Bash test script)
- ✅ test-sync-api.ps1 (PowerShell test script)
- ✅ SYNC_IMPLEMENTATION_SUMMARY.md (This file)

**Build Status**: ✅ SUCCESS
