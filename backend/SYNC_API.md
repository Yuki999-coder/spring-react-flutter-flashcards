# Sync API Documentation

## Overview

Sync API hỗ trợ đồng bộ dữ liệu hai chiều (bidirectional sync) cho mobile app offline-first (giống Anki). API cho phép mobile app:

1. **Pull** (Tải xuống): Lấy các thay đổi từ server sau lần đồng bộ cuối
2. **Push** (Tải lên): Gửi các thay đổi được tạo offline lên server

## Base URL

```
/api/v1/sync
```

## Authentication

Tất cả endpoints yêu cầu JWT token trong header:

```
Authorization: Bearer <your-jwt-token>
```

---

## API Endpoints

### 1. Pull Data (GET /api/v1/sync)

**Mục đích**: Tải xuống tất cả các thay đổi từ server sau lần đồng bộ cuối.

**Method**: `GET`

**Query Parameters**:
- `lastSyncTime` (optional): Timestamp của lần đồng bộ cuối cùng thành công
  - Format: ISO 8601 - `yyyy-MM-dd'T'HH:mm:ss`
  - Ví dụ: `2024-01-15T10:30:00`
  - Nếu **null** hoặc không truyền: Trả về **tất cả dữ liệu** (first sync)

**Request Example**:

```http
GET /api/v1/sync?lastSyncTime=2024-01-15T10:30:00
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response** (200 OK):

```json
{
  "serverTime": "2024-01-16T14:25:30",
  "folders": [
    {
      "id": 1,
      "userId": 5,
      "name": "Vietnamese Vocabulary",
      "color": "#FF5733",
      "createdAt": "2024-01-15T12:00:00",
      "updatedAt": "2024-01-15T14:30:00"
    }
  ],
  "decks": [
    {
      "id": 10,
      "userId": 5,
      "folderId": 1,
      "title": "Basic Words",
      "description": "Common vocabulary",
      "sourceType": "LOCAL",
      "sourceId": null,
      "isDeleted": false,
      "createdAt": "2024-01-15T13:00:00",
      "updatedAt": "2024-01-16T10:15:00",
      "lastViewedAt": "2024-01-16T09:00:00"
    }
  ],
  "cards": [
    {
      "id": 100,
      "deckId": 10,
      "term": "Hello",
      "definition": "Xin chào",
      "example": "Hello, how are you?",
      "imageUrl": null,
      "audioUrl": null,
      "position": 0,
      "tags": ["greeting", "basic"],
      "sourceCardId": null,
      "isStarred": true,
      "isDeleted": false,
      "createdAt": "2024-01-15T13:30:00",
      "updatedAt": "2024-01-16T11:00:00"
    }
  ],
  "studyLogs": [
    {
      "id": 500,
      "userId": 5,
      "cardId": 100,
      "grade": "GOOD",
      "action": "REVIEW",
      "timeTakenMs": 3500,
      "reviewedAt": "2024-01-16T12:00:00"
    }
  ],
  "cardProgress": [
    {
      "id": 200,
      "userId": 5,
      "cardId": 100,
      "learningState": "LEARNING",
      "nextReview": "2024-01-17T12:00:00",
      "interval": 1,
      "easeFactor": 2.5,
      "repetitions": 2,
      "createdAt": "2024-01-15T13:30:00",
      "updatedAt": "2024-01-16T12:00:00"
    }
  ]
}
```

**Logic**:
- Trả về tất cả entities có `updatedAt > lastSyncTime` (hoặc `reviewedAt` cho StudyLog)
- Chỉ trả về dữ liệu của user hiện tại (security)
- Bao gồm cả soft-deleted items (`isDeleted = true`) để mobile có thể xóa local data

---

### 2. Push Data (POST /api/v1/sync)

**Mục đích**: Tải lên các thay đổi được tạo offline từ mobile lên server.

**Method**: `POST`

**Request Body**:

```json
{
  "folders": [
    {
      "id": null,
      "name": "New Folder from Mobile",
      "color": "#00FF00"
    }
  ],
  "decks": [
    {
      "id": null,
      "folderId": 1,
      "title": "New Deck Created Offline",
      "description": "Created while offline",
      "sourceType": "LOCAL",
      "sourceId": null,
      "isDeleted": false,
      "lastViewedAt": "2024-01-16T08:00:00"
    },
    {
      "id": 10,
      "folderId": 1,
      "title": "Updated Deck Title",
      "description": "Updated description",
      "sourceType": "LOCAL",
      "sourceId": null,
      "isDeleted": false,
      "lastViewedAt": "2024-01-16T09:00:00"
    }
  ],
  "cards": [
    {
      "id": null,
      "deckId": 10,
      "term": "Goodbye",
      "definition": "Tạm biệt",
      "example": "Goodbye! See you later.",
      "imageUrl": null,
      "audioUrl": null,
      "position": 1,
      "tags": ["farewell"],
      "sourceCardId": null,
      "isStarred": false,
      "isDeleted": false
    }
  ],
  "studyLogs": [
    {
      "id": null,
      "cardId": 100,
      "grade": "GOOD",
      "action": "REVIEW",
      "timeTakenMs": 4200,
      "reviewedAt": "2024-01-16T13:00:00"
    }
  ],
  "cardProgress": [
    {
      "id": null,
      "cardId": 100,
      "learningState": "LEARNING",
      "nextReview": "2024-01-18T12:00:00",
      "interval": 2,
      "easeFactor": 2.6,
      "repetitions": 3
    }
  ]
}
```

**Response** (200 OK):

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

**Logic**:
- `id = null`: Tạo entity mới trên server
- `id != null`: Cập nhật entity đã tồn tại
- Server validate ownership (user chỉ có thể push dữ liệu của chính mình)
- Trả về `serverTime` để mobile cập nhật `lastSyncTime`

---

### 3. Get Server Time (GET /api/v1/sync/time)

**Mục đích**: Lấy thời gian server hiện tại để đồng bộ clock.

**Method**: `GET`

**Request**:

```http
GET /api/v1/sync/time
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response** (200 OK):

```
"2024-01-16T14:35:00"
```

**Use Case**: Mobile app có thể sử dụng để đồng bộ clock với server trước khi sync.

---

## Data Models

### DeckSyncData

```typescript
{
  id: Long | null,
  userId: Long,
  folderId: Long | null,
  title: String,
  description: String | null,
  sourceType: "LOCAL" | "QUIZLET" | "ANKI",
  sourceId: String | null,
  isDeleted: Boolean,
  createdAt: DateTime,
  updatedAt: DateTime,
  lastViewedAt: DateTime | null
}
```

### CardSyncData

```typescript
{
  id: Long | null,
  deckId: Long,
  term: String,
  definition: String,
  example: String | null,
  imageUrl: String | null,
  audioUrl: String | null,
  position: Integer,
  tags: String[] | null,
  sourceCardId: String | null,
  isStarred: Boolean,
  isDeleted: Boolean,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### StudyLogSyncData

```typescript
{
  id: Long | null,
  userId: Long,
  cardId: Long,
  grade: "AGAIN" | "HARD" | "GOOD" | "EASY",
  action: "LEARN" | "REVIEW",
  timeTakenMs: Integer | null,
  reviewedAt: DateTime
}
```

### CardProgressSyncData

```typescript
{
  id: Long | null,
  userId: Long,
  cardId: Long,
  learningState: "NEW" | "LEARNING" | "REVIEW" | "RELEARNING",
  nextReview: DateTime | null,
  interval: Integer,
  easeFactor: Float,
  repetitions: Integer,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### FolderSyncData

```typescript
{
  id: Long | null,
  userId: Long,
  name: String,
  color: String | null,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

## Sync Workflow (Mobile Client)

### Initial Sync (First Time)

```
1. Mobile: GET /api/v1/sync (no lastSyncTime)
2. Server: Returns ALL user data
3. Mobile: Save to local SQLite database
4. Mobile: Store serverTime as lastSyncTime
```

### Subsequent Sync (Bidirectional)

```
1. Mobile: Check if there are local changes (dirty flag)

2. PUSH Phase:
   - Mobile: Collect all local changes (new/updated/deleted)
   - Mobile: POST /api/v1/sync (send changes)
   - Server: Save changes, return serverTime
   - Mobile: Clear dirty flags

3. PULL Phase:
   - Mobile: GET /api/v1/sync?lastSyncTime={stored_time}
   - Server: Return entities with updatedAt > lastSyncTime
   - Mobile: Apply changes to local database
   - Mobile: Update lastSyncTime = serverTime

4. Mobile: Resolve conflicts if needed (Last-Write-Wins strategy)
```

### Conflict Resolution

**Strategy**: Last-Write-Wins (LWW)

- Server luôn ưu tiên `updatedAt` mới nhất
- Mobile pull sau khi push để nhận latest state
- Nếu có conflict, dữ liệu từ server sẽ override local

---

## Security

### Authorization

- Tất cả endpoints yêu cầu JWT authentication
- User chỉ có thể truy cập dữ liệu của chính mình
- Server validate ownership ở mọi operation

### Validation

- Push requests validate:
  - User không thể tạo/update entity của user khác
  - DeckId phải tồn tại và thuộc về user
  - CardId phải tồn tại và thuộc về user
  - FolderId (nếu có) phải thuộc về user

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "JWT token missing or invalid"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Cannot update deck owned by another user"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Deck not found: 123"
}
```

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid timestamp format"
}
```

---

## Testing với Postman/curl

### 1. Login để lấy JWT token

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "user@example.com",
  "id": 5
}
```

### 2. Pull all data (first sync)

```bash
curl -X GET "http://localhost:8080/api/v1/sync" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 3. Pull changes since last sync

```bash
curl -X GET "http://localhost:8080/api/v1/sync?lastSyncTime=2024-01-15T10:30:00" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 4. Push new deck and card

```bash
curl -X POST http://localhost:8080/api/v1/sync \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "decks": [
      {
        "id": null,
        "title": "New Deck from Mobile",
        "description": "Created offline",
        "sourceType": "LOCAL",
        "isDeleted": false
      }
    ],
    "cards": [
      {
        "id": null,
        "deckId": 1,
        "term": "Test",
        "definition": "Kiểm tra",
        "position": 0,
        "isStarred": false,
        "isDeleted": false
      }
    ]
  }'
```

### 5. Get server time

```bash
curl -X GET "http://localhost:8080/api/v1/sync/time" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Performance Considerations

### Optimization Tips

1. **Pagination**: Hiện tại API trả về tất cả data. Nếu data lớn, cân nhắc thêm pagination:
   ```
   GET /api/v1/sync?lastSyncTime=...&page=0&size=100
   ```

2. **Delta Sync**: API đã implement delta sync (chỉ trả về thay đổi sau lastSyncTime)

3. **Compression**: Mobile nên enable GZIP compression cho requests/responses

4. **Batch Push**: Gom nhiều thay đổi thành một request thay vì sync từng item

### Database Indexes

Đảm bảo database có indexes cho performance:

```sql
CREATE INDEX idx_decks_updated_at ON decks(updated_at);
CREATE INDEX idx_cards_updated_at ON cards(updated_at);
CREATE INDEX idx_card_progress_updated_at ON card_progress(updated_at);
CREATE INDEX idx_study_log_reviewed_at ON study_log(reviewed_at);
CREATE INDEX idx_folders_updated_at ON folders(updated_at);
```

---

## Mobile Implementation Notes (Flutter/SQLite)

### Local Database Schema

```dart
// Thêm dirty flag để track local changes
class DeckLocal {
  int? id;
  String title;
  bool isDirty; // true = has local changes
  DateTime? lastSyncedAt;
}

// Store last sync time
SharedPreferences.setString('lastSyncTime', serverTime);
```

### Sync Service (Pseudo-code)

```dart
Future<void> syncWithServer() async {
  try {
    // 1. Push local changes
    if (hasLocalChanges()) {
      final localChanges = collectLocalChanges();
      final pushResponse = await api.pushData(localChanges);
      clearDirtyFlags();
    }

    // 2. Pull server changes
    final lastSyncTime = await getLastSyncTime();
    final pullResponse = await api.pullData(lastSyncTime);
    
    // 3. Apply to local database
    await applyServerChanges(pullResponse);
    
    // 4. Update last sync time
    await saveLastSyncTime(pullResponse.serverTime);
    
    print('Sync completed successfully');
  } catch (e) {
    print('Sync failed: $e');
    // Retry later
  }
}
```

---

## Changelog

### Version 1.0 (2024-01-16)
- ✅ Initial release
- ✅ Pull API (GET /api/v1/sync)
- ✅ Push API (POST /api/v1/sync)
- ✅ Server time API (GET /api/v1/sync/time)
- ✅ Support for Folders, Decks, Cards, StudyLogs, CardProgress
- ✅ Delta sync based on updatedAt timestamps
- ✅ Security validation and ownership checks

---

## Support

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub repository.
