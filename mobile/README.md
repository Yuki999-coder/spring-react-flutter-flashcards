# 📱 Flashcards Mobile App

Offline-first Flutter mobile application for flashcard learning with sync capabilities.

## 🚀 **Quick Start → [QUICKSTART.md](./QUICKSTART.md)**

```bash
cd mobile
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run
```

## ✨ Implementation Status

### ✅ Phase 1: Foundation (Completed)
- Drift database schema (Decks & Cards)
- Clean Architecture structure (Domain/Data/Presentation)
- UUID-based IDs matching backend
- Sync status tracking (Pending, Synced, Conflict)
- Freezed DTOs for API communication

### ✅ Phase 2: Domain & UI (Completed)
- **Domain Entities**: Pure Dart `Deck` and `Card` entities
- **Repository Pattern**: Interface + Implementation with Drift
- **Riverpod State Management**: AsyncNotifier pattern
- **HomeScreen**: Deck list with pull-to-refresh & empty states
- **AddDeckDialog**: Form with validation & loading states
- **DeckCard Widget**: Material Design 3 with sync badges

### ✅ Phase 3: Card Management (Completed)
- **DeckDetailScreen**: View all cards in a deck
- **AddEditCardScreen**: Create/edit cards with live preview
- **CardListItem**: Display cards with learning state badges
- **Swipe-to-Delete**: Smooth deletion with confirmation
- **Star Cards**: Mark important cards for quick access
- **Form Validation**: Comprehensive validation for Front/Back fields

### ✅ Phase 4: Study/Review Mode (Completed)
- **ReviewScreen**: Interactive flashcard study with flip animation
- **SRS Algorithm**: SM-2 spaced repetition system (matching backend)
- **Swipeable Cards**: Gesture-based card navigation
- **Grade Buttons**: Again, Hard, Good, Easy with interval preview
- **Progress Tracking**: Real-time statistics and accuracy
- **Due Cards**: Automatic filtering of cards due for review
- **Review Statistics**: Track performance during study sessions
- **Review Logging**: Complete history tracking with ReviewLog table
- **Time Tracking**: Measure review duration for analytics

### ✅ Phase 5: Authentication & Sync (Completed)
- **LoginScreen**: Email & password authentication UI
- **AuthRepository**: API calls to `POST /api/v1/auth/login`
- **AuthProvider**: Riverpod state management for auth
- **Secure Storage**: JWT tokens stored with flutter_secure_storage
- **ApiClient**: Dynamic token injection for API requests
- **Sync Integration**: Sync button in HomeScreen with auth check
- **User Menu**: Account dropdown with logout functionality

### ✅ Phase 6: SRS Enhancement (Completed - NEW!)
- **ReviewLog Table**: Track review history for analytics
- **SRSHelper**: Wrapper class for easy SM-2 algorithm access
- **saveReviewResult()**: Single method for complete review processing
- **Automatic Sync Trigger**: syncStatus=2 set on card review
- **Time Tracking**: Capture review duration for each card
- **Database Migration**: v1 → v2 with ReviewLogs table

### ⏭️ Phase 7: Next Steps
- **SyncService**: Full implementation of data synchronization
- **Conflict Resolution**: Handle server/local data conflicts
- **Background Sync**: Periodic automatic sync
- **Folder Management**: Create and organize deck folders
- **Advanced Study Modes**: Match game, test mode, typing mode

## 🏗️ Architecture

**Clean Architecture** with dependency inversion:

```
Presentation (UI + Riverpod)
      ↓ uses
Domain (Entities + Repository Interface)
      ↑ implements
Data (Drift Database + Repository Implementation)
```

## 🛠️ Technologies

- **Flutter SDK** (>=3.0.0)
- **Drift**: Type-safe SQLite ORM
- **Riverpod**: State management with AsyncNotifier
- **Freezed**: Immutable models & unions
- **UUID**: Unique IDs for offline-first
- **Material Design 3**: Modern UI components

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)**: Run the app in 3 steps
- **[SETUP.md](./SETUP.md)**: Detailed architecture guide

## Prerequisites
- Flutter SDK (>=3.0.0)
- Android Studio / Xcode (for mobile development)
- Backend server on `localhost:8080` (for sync features)

### Installation

1. **Navigate to mobile directory**:
```bash
cd mobile
```

2. **Install dependencies**:
```bash
flutter pub get
```

3. **Generate code** (Drift tables, Freezed models, JSON serialization):
```bash
# Windows
generate.bat

# macOS/Linux
chmod +x generate.sh
./generate.sh
```

4. **Run the app**:
```bash
flutter run
```

## 📋 Project Structure

See [SETUP.md](SETUP.md) for detailed architecture and project structure.

## 🛠️ Development

### Code Generation

Run this whenever you modify:
- Drift database tables
- Freezed models
- JSON serializable classes

```bash
flutter pub run build_runner build --delete-conflicting-outputs

# Or in watch mode (auto-regenerate)
flutter pub run build_runner watch
```

### Running Tests

```bash
flutter test
```

### Format Code

```bash
flutter format lib/
```

### Analyze Code

```bash
flutter analyze
```

## 📦 Key Technologies

- **Flutter**: Cross-platform UI framework
- **Drift**: Type-safe SQL database (SQLite)
- **Riverpod**: State management
- **Dio**: HTTP client
- **Freezed**: Immutable data models
- **UUID**: Unique identifier generation

## 🗄️ Database Schema

### Decks
- Stores flashcard decks
- UUID-based IDs from server
- Offline-first with sync support

### Cards
- Individual flashcards
- SRS (Spaced Repetition System) data
- Image and audio support

See [SETUP.md](SETUP.md) for complete schema details.

## 🔧 Configuration

Create `.env` file in `mobile/` directory:
```
API_BASE_URL=http://localhost:8080/api
```

## 📱 Platform Support

- ✅ Android (API 21+)
- ✅ iOS (12.0+)
- ⚠️ Web (limited local storage)

## 🎯 Next Steps

1. ✅ Database schema created
2. ✅ DTOs defined
3. ⏭️ Implement repositories
4. ⏭️ Create use cases
5. ⏭️ Build UI screens
6. ⏭️ Add authentication
7. ⏭️ Implement sync service
8. ⏭️ Add SRS algorithm

## 📝 License

Part of Spring-React-Flutter-Flashcards monorepo.

## 🤝 Related Projects

- `/backend` - Spring Boot API server
- `/web` - Next.js web application
