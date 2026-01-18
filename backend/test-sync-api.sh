#!/bin/bash

# Sync API Test Script
# Test các endpoints của Sync API

BASE_URL="http://localhost:8080/api/v1"
TOKEN=""

echo "========================================="
echo "SYNC API TEST SCRIPT"
echo "========================================="
echo ""

# Step 1: Login để lấy JWT token
echo "1. Đăng nhập để lấy JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login thành công!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Get server time
echo "2. Lấy server time..."
curl -s -X GET "$BASE_URL/sync/time" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Step 3: Pull all data (first sync)
echo "3. Pull tất cả dữ liệu (first sync)..."
PULL_RESPONSE=$(curl -s -X GET "$BASE_URL/sync" \
  -H "Authorization: Bearer $TOKEN")

echo $PULL_RESPONSE | jq '{
  serverTime: .serverTime,
  foldersCount: (.folders | length),
  decksCount: (.decks | length),
  cardsCount: (.cards | length),
  studyLogsCount: (.studyLogs | length),
  cardProgressCount: (.cardProgress | length)
}'
echo ""

# Step 4: Extract serverTime for next sync
SERVER_TIME=$(echo $PULL_RESPONSE | grep -o '"serverTime":"[^"]*' | cut -d'"' -f4)
echo "Server Time: $SERVER_TIME"
echo ""

# Step 5: Wait a bit
echo "4. Chờ 2 giây..."
sleep 2
echo ""

# Step 6: Push new deck and card
echo "5. Push deck và card mới từ mobile..."
PUSH_RESPONSE=$(curl -s -X POST "$BASE_URL/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decks": [
      {
        "id": null,
        "title": "Deck from Mobile Offline",
        "description": "Created while offline",
        "sourceType": "LOCAL",
        "isDeleted": false
      }
    ],
    "cards": [
      {
        "id": null,
        "deckId": 1,
        "term": "Sync Test",
        "definition": "Testing sync API",
        "position": 0,
        "isStarred": false,
        "isDeleted": false
      }
    ]
  }')

echo $PUSH_RESPONSE | jq '.'
echo ""

# Step 7: Pull changes since last sync
echo "6. Pull thay đổi kể từ lần sync cuối ($SERVER_TIME)..."
curl -s -X GET "$BASE_URL/sync?lastSyncTime=$SERVER_TIME" \
  -H "Authorization: Bearer $TOKEN" | jq '{
  serverTime: .serverTime,
  foldersCount: (.folders | length),
  decksCount: (.decks | length),
  cardsCount: (.cards | length),
  studyLogsCount: (.studyLogs | length),
  cardProgressCount: (.cardProgress | length)
}'
echo ""

echo "========================================="
echo "✅ Hoàn thành test Sync API!"
echo "========================================="
