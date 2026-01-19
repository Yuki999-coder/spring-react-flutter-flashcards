# 🚀 Quick Start Guide - Run the App

## Step-by-Step Instructions

### 1️⃣ Install Dependencies
```bash
cd mobile
flutter pub get
```

### 2️⃣ Generate Code (REQUIRED!)
This generates Drift database tables, Freezed models, and Riverpod providers.

**Windows:**
```bash
generate.bat
```

**Mac/Linux:**
```bash
chmod +x generate.sh
./generate.sh
```

**Or manually:**
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

### 3️⃣ Run the App
```bash
flutter run
```

## ✅ What You Should See

### Phase 1 & 2: Deck Management
1. **Home Screen** with "No Decks Yet" empty state
2. **Floating Action Button (+)** to create a new deck
3. Click **"New Deck"** → Opens dialog
4. Enter **Title** and **Description** → Click **"Create"**
5. Deck appears in the list with sync status badge

### Phase 3: Card Management
6. **Tap on a deck** → Opens DeckDetailScreen
7. **Empty state** shows "Chưa có thẻ nào"
8. **Tap FAB "Thêm thẻ"** → Opens AddEditCardScreen
9. Enter **Front** (e.g., "Hello") and **Back** (e.g., "Xin chào")
10. **Live preview** updates as you type
11. Click **"Thêm thẻ"** → Card appears in list
12. **Learning state badge** shows "Thẻ mới" (grey)
13. **Tap star icon** to mark as important
14. **Swipe left** to delete (with confirmation)
15. **Tap menu (⋮)** for Edit/Delete options

### Phase 4: Study/Review Mode (NEW!)
16. **Tap "Học ngay" button** → Opens ReviewScreen
17. **Flip card** by tapping on it to see the answer
18. **Swipe or tap grade buttons**:
    - Left/Red (Again): 1 day - Complete failure
    - Down/Orange (Hard): Minimal increase - Difficult
    - Up/Green (Good): Normal growth - Standard recall
    - Right/Blue (Easy): Fast growth - Perfect recall
19. **Progress bar** shows remaining cards
20. **Statistics** track your performance
21. **Complete screen** shows accuracy and review counts

## 🧪 Test the Implementation

### Test Deck Operations
1. **Create a deck**:
   - Title: "Spanish Vocabulary"
   - Description: "Common words and phrases"
   - Status: "Pending Sync" (orange badge)

2. **View the deck** in the list
3. **Pull to refresh** the list
4. **Delete a deck** via the menu (⋮)

### Test Card Operations
1. **Open a deck** by tapping on it
2. **Create multiple cards**:
   - Card 1: "Hello" → "Xin chào"
   - Card 2: "Thank you" → "Cảm ơn"
   - Card 3: "Goodbye" → "Tạm biệt"
3. **Edit a card**: Menu (⋮) → Chỉnh sửa
4. **Star a card**: Tap the star icon (turns yellow)
5. **Delete a card**: Swipe left OR menu → Xóa
6. **View card details**: Tap on a card

### Test Study/Review Mode (NEW!)
1. **Start study session**: Tap "Học ngay" button in DeckDetailScreen
2. **Flip cards**: Tap on the card to see the answer
3. **Grade your recall**:
   - Swipe right (or tap Blue "Dễ") if you knew it perfectly
   - Swipe up (or tap Green "Tốt") for normal recall
   - Swipe down (or tap Orange "Khó") if it was difficult
   - Swipe left (or tap Red "Lại") if you forgot
4. **Watch progress**: Progress bar updates after each card
5. **Complete session**: See statistics and accuracy
6. **Review intervals**: Check interval predictions on grade buttons

## 📱 Features Implemented

✅ **Offline-First**: All data stored locally in SQLite  
✅ **Clean Architecture**: Domain, Data, Presentation layers  
✅ **Riverpod State Management**: AsyncNotifier pattern  
✅ **Repository Pattern**: Interface + Implementation  
✅ **Material Design 3**: Modern UI with proper theming  
✅ **Error Handling**: Loading, error, and empty states  
✅ **Sync Status**: Visual badges (Synced, Pending, Conflict)  
✅ **Card Management**: Full CRUD with swipe-to-delete  
✅ **Form Validation**: Front & Back required  
✅ **Live Preview**: Card preview updates as you type  
✅ **Learning States**: Visual badges for progress  
✅ **Study/Review Mode**: Flashcard flip animation with swipe gestures (NEW!)  
✅ **SRS Algorithm**: SM-2 spaced repetition matching backend (NEW!)  
✅ **Grade Buttons**: Again, Hard, Good, Easy with interval preview (NEW!)  
✅ **Review Statistics**: Real-time progress and accuracy tracking (NEW!)  

## 🗂️ Project Structure

```
lib/
├── main.dart ← Updated to use HomeScreen
├── core/
│   ├── constants/app_constants.dart
│   ├── errors/failures.dart
│   ├── errors/exceptions.dart
│   └── utils/
│       ├── datetime_utils.dart
│       └── uuid_utils.dart
└── features/flashcard/
    ├── domain/
    │   ├── entities/
    │   │   ├── deck.dart ← Pure Dart entity
    │   │   └── card.dart
    │   └── repositories/
    │       └── flashcard_repository.dart ← Interface
    ├── data/
    │   ├── datasources/local_db/
    │   │   ├── app_database.dart ← Drift database
    │   │   └── database_provider.dart
    │   ├── models/ (DTOs)
    │   └── repositories/
    │       └── flashcard_repository_impl.dart ← Implementation
    └── presentation/
        ├── providers/
        │   ├── repository_provider.dart
        │   └── deck_list_provider.dart ← AsyncNotifier
        ├── pages/
        │   └── home_screen.dart ← Main UI
        └── widgets/
            ├── add_deck_dialog.dart
            └── deck_card.dart
```

## 🔍 Code Flow

1. **User opens app** → `main.dart` loads `HomeScreen`
2. **HomeScreen** watches `deckListProvider`
3. **Provider** calls `FlashcardRepository.getDecks()`
4. **Repository** queries `AppDatabase` (Drift)
5. **Mapper** converts `DeckEntity` → `Deck` (domain entity)
6. **UI** displays list using `AsyncValue.when()`

## 🎯 Next Steps

1. ✅ Domain Layer created
2. ✅ Repository Pattern implemented
3. ✅ Riverpod state management working
4. ✅ HomeScreen with deck list
5. ✅ DeckDetailScreen with card list (NEW!)
6. ✅ AddEditCardScreen with validation (NEW!)
7. ⏭️ Study/Review screen with flashcards
8. ⏭️ SRS algorithm implementation
9. ⏭️ Authentication
10. ⏭️ API sync service

## 🐛 Troubleshooting

### Code Generation Errors
```bash
# Clean and regenerate
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Import Errors
- Make sure all `.g.dart` and `.freezed.dart` files are generated
- Check that paths use forward slashes even on Windows

### Database Errors
- Delete the app from device/emulator
- Run again to recreate database

## 📚 Key Technologies Used

- **Drift**: Type-safe SQL queries
- **Riverpod**: State management with `AsyncNotifier`
- **UUID**: Unique IDs for offline-first
- **Material 3**: Modern design system
- **Clean Architecture**: Separation of concerns

---

**Ready to code!** 🎉 Run `flutter run` and start building your flashcard app!
