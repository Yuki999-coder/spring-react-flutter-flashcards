# Sync API Test Script for Windows PowerShell
# Test các endpoints của Sync API

$BASE_URL = "http://localhost:8080/api/v1"
$TOKEN = ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SYNC API TEST SCRIPT" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login để lấy JWT token
Write-Host "1. Đăng nhập để lấy JWT token..." -ForegroundColor Yellow

$loginBody = @{
    email = "user@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $TOKEN = $loginResponse.token
    Write-Host "✅ Login thành công!" -ForegroundColor Green
    Write-Host "Token: $($TOKEN.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get server time
Write-Host "2. Lấy server time..." -ForegroundColor Yellow

$headers = @{
    Authorization = "Bearer $TOKEN"
}

$serverTimeResponse = Invoke-RestMethod -Uri "$BASE_URL/sync/time" `
    -Method Get `
    -Headers $headers

Write-Host "Server Time: $serverTimeResponse" -ForegroundColor Green
Write-Host ""

# Step 3: Pull all data (first sync)
Write-Host "3. Pull tất cả dữ liệu (first sync)..." -ForegroundColor Yellow

$pullResponse = Invoke-RestMethod -Uri "$BASE_URL/sync" `
    -Method Get `
    -Headers $headers

Write-Host "Server Time: $($pullResponse.serverTime)" -ForegroundColor Green
Write-Host "Folders: $($pullResponse.folders.Count)" -ForegroundColor Green
Write-Host "Decks: $($pullResponse.decks.Count)" -ForegroundColor Green
Write-Host "Cards: $($pullResponse.cards.Count)" -ForegroundColor Green
Write-Host "Study Logs: $($pullResponse.studyLogs.Count)" -ForegroundColor Green
Write-Host "Card Progress: $($pullResponse.cardProgress.Count)" -ForegroundColor Green
Write-Host ""

$SERVER_TIME = $pullResponse.serverTime

# Step 4: Wait a bit
Write-Host "4. Chờ 2 giây..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host ""

# Step 5: Push new deck and card
Write-Host "5. Push deck và card mới từ mobile..." -ForegroundColor Yellow

$pushBody = @{
    decks = @(
        @{
            id = $null
            title = "Deck from Mobile Offline"
            description = "Created while offline"
            sourceType = "LOCAL"
            isDeleted = $false
        }
    )
    cards = @(
        @{
            id = $null
            deckId = 1
            term = "Sync Test"
            definition = "Testing sync API"
            position = 0
            isStarred = $false
            isDeleted = $false
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $pushResponse = Invoke-RestMethod -Uri "$BASE_URL/sync" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $pushBody

    Write-Host "✅ Push thành công!" -ForegroundColor Green
    Write-Host "Server Time: $($pushResponse.serverTime)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Push failed: $_" -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Response)" -ForegroundColor Red
    Write-Host ""
}

# Step 6: Pull changes since last sync
Write-Host "6. Pull thay đổi kể từ lần sync cuối ($SERVER_TIME)..." -ForegroundColor Yellow

$pullDeltaResponse = Invoke-RestMethod -Uri "$BASE_URL/sync?lastSyncTime=$SERVER_TIME" `
    -Method Get `
    -Headers $headers

Write-Host "Server Time: $($pullDeltaResponse.serverTime)" -ForegroundColor Green
Write-Host "New Folders: $($pullDeltaResponse.folders.Count)" -ForegroundColor Green
Write-Host "New Decks: $($pullDeltaResponse.decks.Count)" -ForegroundColor Green
Write-Host "New Cards: $($pullDeltaResponse.cards.Count)" -ForegroundColor Green
Write-Host "New Study Logs: $($pullDeltaResponse.studyLogs.Count)" -ForegroundColor Green
Write-Host "New Card Progress: $($pullDeltaResponse.cardProgress.Count)" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Hoàn thành test Sync API!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
