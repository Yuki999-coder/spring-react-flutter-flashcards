import '../entities/deck.dart';
import '../entities/card.dart';

/// Repository Interface for Flashcard operations
/// Defines the contract for data operations (follows Dependency Inversion Principle)
abstract class FlashcardRepository {
  // ==================== DECK OPERATIONS ====================
  
  /// Get all decks from local database
  Future<List<Deck>> getDecks();
  
  /// Get a single deck by ID
  Future<Deck?> getDeckById(String id);
  
  /// Get decks by folder ID
  Future<List<Deck>> getDecksByFolder(String folderId);
  
  /// Get uncategorized decks (no folder)
  Future<List<Deck>> getUncategorizedDecks();
  
  /// Create a new deck
  /// Returns the created deck with generated ID
  Future<Deck> createDeck({
    required String title,
    String? description,
    String? folderId,
  });
  
  /// Update an existing deck
  Future<Deck> updateDeck({
    required String id,
    String? title,
    String? description,
    String? folderId,
  });
  
  /// Delete a deck (soft delete)
  Future<void> deleteDeck(String id);
  
  /// Get decks pending sync
  Future<List<Deck>> getDecksPendingSync();
  
  // ==================== CARD OPERATIONS ====================
  
  /// Get all cards for a specific deck
  Future<List<Card>> getCardsByDeck(String deckId);
  
  /// Alias for getCardsByDeck (for compatibility)
  Future<List<Card>> getCardsByDeckId({required String deckId}) => getCardsByDeck(deckId);
  
  /// Get a single card by ID
  Future<Card?> getCardById(String id);
  
  /// Get cards due for review
  Future<List<Card>> getCardsDueForReview(String deckId);
  
  /// Get new cards (never studied)
  Future<List<Card>> getNewCards(String deckId, {int limit = 20});
  
  /// Create a new card
  Future<Card> createCard({
    required String deckId,
    required String front,
    required String back,
    String? example,
    String? imageUrl,
    String? audioUrl,
  });
  
  /// Update an existing card
  Future<Card> updateCard({
    required String id,
    String? front,
    String? back,
    String? example,
    String? imageUrl,
    String? audioUrl,
  });
  
  /// Delete a card (soft delete)
  Future<void> deleteCard(String id);
  
  /// Update card SRS data after review
  Future<Card> updateCardSRS({
    required String cardId,
    required String learningState,
    required int interval,
    required double easeFactor,
    required int reviewCount,
    DateTime? nextReview,
    required DateTime lastReviewed,
  });
  
  /// Get cards pending sync
  Future<List<Card>> getCardsPendingSync();
}
