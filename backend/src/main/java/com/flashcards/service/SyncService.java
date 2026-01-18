package com.flashcards.service;

import com.flashcards.dto.request.SyncPushRequest;
import com.flashcards.dto.response.SyncDataResponse;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.*;
import com.flashcards.model.enums.Grade;
import com.flashcards.model.enums.LearningState;
import com.flashcards.model.enums.SourceType;
import com.flashcards.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Sync Service
 * Handles offline-first mobile app synchronization
 * Supports bidirectional sync for Decks, Cards, StudyLogs, CardProgress, Folders
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService {

    private final DeckRepository deckRepository;
    private final CardRepository cardRepository;
    private final StudyLogRepository studyLogRepository;
    private final CardProgressRepository cardProgressRepository;
    private final FolderRepository folderRepository;

    /**
     * Pull data from server (GET /api/v1/sync)
     * Returns all entities created or updated after lastSyncTime
     *
     * @param userId User ID requesting sync
     * @param lastSyncTime Timestamp of last successful sync (null for first sync)
     * @return SyncDataResponse containing changed entities
     */
    @Transactional(readOnly = true)
    public SyncDataResponse pullData(UUID userId, Instant lastSyncTime) {
        log.info("Pull sync requested for userId: {}, lastSyncTime: {}", userId, lastSyncTime);

        Instant syncPoint = lastSyncTime != null ? lastSyncTime : Instant.ofEpochMilli(0);
        Instant serverTime = Instant.now();

        // Pull Folders
        List<SyncDataResponse.FolderSyncData> folders = folderRepository.findAll().stream()
            .filter(folder -> folder.getUserId().equals(userId))
            .filter(folder -> folder.getUpdatedAt() != null && folder.getUpdatedAt().isAfter(syncPoint))
            .map(this::mapFolderToSyncData)
            .collect(Collectors.toList());

        // Pull Decks
        List<SyncDataResponse.DeckSyncData> decks = deckRepository.findAll().stream()
            .filter(deck -> deck.getUserId().equals(userId))
            .filter(deck -> deck.getUpdatedAt() != null && deck.getUpdatedAt().isAfter(syncPoint))
            .map(this::mapDeckToSyncData)
            .collect(Collectors.toList());

        // Pull Cards (only for user's decks)
        List<UUID> userDeckIds = deckRepository.findAllByUserId(userId).stream()
            .map(Deck::getId)
            .collect(Collectors.toList());

        List<SyncDataResponse.CardSyncData> cards = cardRepository.findAll().stream()
            .filter(card -> userDeckIds.contains(card.getDeckId()))
            .filter(card -> card.getUpdatedAt() != null && card.getUpdatedAt().isAfter(syncPoint))
            .map(this::mapCardToSyncData)
            .collect(Collectors.toList());

        // Pull StudyLogs
        List<SyncDataResponse.StudyLogSyncData> studyLogs = studyLogRepository.findAll().stream()
            .filter(log -> log.getUserId().equals(userId))
            .filter(log -> log.getReviewedAt() != null && log.getReviewedAt().isAfter(syncPoint))
            .map(this::mapStudyLogToSyncData)
            .collect(Collectors.toList());

        // Pull CardProgress
        List<SyncDataResponse.CardProgressSyncData> cardProgress = cardProgressRepository.findAll().stream()
            .filter(progress -> progress.getUserId().equals(userId))
            .filter(progress -> progress.getUpdatedAt() != null && progress.getUpdatedAt().isAfter(syncPoint))
            .map(this::mapCardProgressToSyncData)
            .collect(Collectors.toList());

        log.info("Pull sync completed: {} folders, {} decks, {} cards, {} studyLogs, {} cardProgress",
            folders.size(), decks.size(), cards.size(), studyLogs.size(), cardProgress.size());

        return SyncDataResponse.builder()
            .serverTime(serverTime)
            .folders(folders)
            .decks(decks)
            .cards(cards)
            .studyLogs(studyLogs)
            .cardProgress(cardProgress)
            .build();
    }

    /**
     * Push data to server (POST /api/v1/sync)
     * Receives changes from mobile and saves to database
     *
     * @param userId User ID pushing changes
     * @param request Sync push request containing changes
     * @return SyncDataResponse with server timestamp
     */
    @Transactional
    public SyncDataResponse pushData(UUID userId, SyncPushRequest request) {
        log.info("Push sync requested for userId: {}", userId);

        List<UUID> createdDeckIds = new ArrayList<>();
        List<UUID> createdCardIds = new ArrayList<>();
        List<UUID> createdFolderIds = new ArrayList<>();

        // Push Folders
        if (request.getFolders() != null && !request.getFolders().isEmpty()) {
            for (SyncPushRequest.FolderPushData folderData : request.getFolders()) {
                Folder folder = saveFolderFromPush(userId, folderData);
                createdFolderIds.add(folder.getId());
            }
            log.info("Pushed {} folders", request.getFolders().size());
        }

        // Push Decks
        if (request.getDecks() != null && !request.getDecks().isEmpty()) {
            for (SyncPushRequest.DeckPushData deckData : request.getDecks()) {
                Deck deck = saveDeckFromPush(userId, deckData);
                createdDeckIds.add(deck.getId());
            }
            log.info("Pushed {} decks", request.getDecks().size());
        }

        // Push Cards
        if (request.getCards() != null && !request.getCards().isEmpty()) {
            for (SyncPushRequest.CardPushData cardData : request.getCards()) {
                Card card = saveCardFromPush(userId, cardData);
                createdCardIds.add(card.getId());
            }
            log.info("Pushed {} cards", request.getCards().size());
        }

        // Push StudyLogs
        if (request.getStudyLogs() != null && !request.getStudyLogs().isEmpty()) {
            for (SyncPushRequest.StudyLogPushData logData : request.getStudyLogs()) {
                saveStudyLogFromPush(userId, logData);
            }
            log.info("Pushed {} study logs", request.getStudyLogs().size());
        }

        // Push CardProgress
        if (request.getCardProgress() != null && !request.getCardProgress().isEmpty()) {
            for (SyncPushRequest.CardProgressPushData progressData : request.getCardProgress()) {
                saveCardProgressFromPush(userId, progressData);
            }
            log.info("Pushed {} card progress", request.getCardProgress().size());
        }

        return SyncDataResponse.builder()
            .serverTime(Instant.now())
            .folders(new ArrayList<>())
            .decks(new ArrayList<>())
            .cards(new ArrayList<>())
            .studyLogs(new ArrayList<>())
            .cardProgress(new ArrayList<>())
            .build();
    }

    // ===== Mapping Methods: Entity -> SyncData =====

    private SyncDataResponse.FolderSyncData mapFolderToSyncData(Folder folder) {
        return SyncDataResponse.FolderSyncData.builder()
            .id(folder.getId().toString())
            .userId(folder.getUserId().toString())
            .name(folder.getName())
            .color(null) // Folder entity doesn't have color field yet
            .createdAt(folder.getCreatedAt())
            .updatedAt(folder.getUpdatedAt())
            .build();
    }

    private SyncDataResponse.DeckSyncData mapDeckToSyncData(Deck deck) {
        return SyncDataResponse.DeckSyncData.builder()
            .id(deck.getId().toString())
            .userId(deck.getUserId().toString())
            .folderId(deck.getFolderId() != null ? deck.getFolderId().toString() : null)
            .title(deck.getTitle())
            .description(deck.getDescription())
            .sourceType(deck.getSourceType() != null ? deck.getSourceType().name() : null)
            .sourceId(deck.getSourceId())
            .deletedAt(deck.getDeletedAt())
            .createdAt(deck.getCreatedAt())
            .updatedAt(deck.getUpdatedAt())
            .lastViewedAt(deck.getLastViewedAt())
            .build();
    }

    private SyncDataResponse.CardSyncData mapCardToSyncData(Card card) {
        return SyncDataResponse.CardSyncData.builder()
            .id(card.getId().toString())
            .deckId(card.getDeckId().toString())
            .term(card.getTerm())
            .definition(card.getDefinition())
            .example(card.getExample())
            .imageUrl(card.getImageUrl())
            .audioUrl(card.getAudioUrl())
            .position(card.getPosition())
            .tags(card.getTags())
            .sourceCardId(card.getSourceCardId())
            .isStarred(card.getIsStarred())
            .deletedAt(card.getDeletedAt())
            .createdAt(card.getCreatedAt())
            .updatedAt(card.getUpdatedAt())
            .build();
    }

    private SyncDataResponse.StudyLogSyncData mapStudyLogToSyncData(StudyLog log) {
        return SyncDataResponse.StudyLogSyncData.builder()
            .id(log.getId().toString())
            .userId(log.getUserId().toString())
            .cardId(log.getCardId().toString())
            .grade(log.getGrade() != null ? log.getGrade().name() : null)
            .action(log.getAction())
            .timeTakenMs(log.getTimeTakenMs())
            .reviewedAt(log.getReviewedAt())
            .build();
    }

    private SyncDataResponse.CardProgressSyncData mapCardProgressToSyncData(CardProgress progress) {
        return SyncDataResponse.CardProgressSyncData.builder()
            .id(progress.getId().toString())
            .userId(progress.getUserId().toString())
            .cardId(progress.getCardId().toString())
            .learningState(progress.getLearningState() != null ? progress.getLearningState().name() : null)
            .nextReview(progress.getNextReview())
            .interval(progress.getInterval())
            .easeFactor(progress.getEaseFactor())
            .repetitions(progress.getRepetitions())
            .createdAt(progress.getCreatedAt())
            .updatedAt(progress.getUpdatedAt())
            .build();
    }

    // ===== Save Methods: PushData -> Entity =====

    private Folder saveFolderFromPush(UUID userId, SyncPushRequest.FolderPushData data) {
        Folder folder;
        if (data.getId() != null && !data.getId().isEmpty()) {
            try {
                UUID folderId = UUID.fromString(data.getId());
                // Update existing - trust mobile's UUID
                folder = folderRepository.findById(folderId)
                    .orElseGet(() -> {
                        // Mobile has UUID but server doesn't - create with mobile's UUID
                        Folder newFolder = new Folder();
                        newFolder.setId(folderId);
                        newFolder.setUserId(userId);
                        return newFolder;
                    });
                
                // Security check
                if (folder.getId() != null && !folder.getUserId().equals(userId)) {
                    throw new UnauthorizedException("Cannot update folder owned by another user");
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid UUID for folder: {}", data.getId());
                throw new RuntimeException("Invalid folder ID format: " + data.getId());
            }
        } else {
            // Create new - let database generate UUID
            folder = new Folder();
            folder.setUserId(userId);
        }

        folder.setName(data.getName());
        // Note: color field not yet implemented in Folder entity
        // folder.setColor(data.getColor());

        return folderRepository.save(folder);
    }

    private Deck saveDeckFromPush(UUID userId, SyncPushRequest.DeckPushData data) {
        Deck deck;
        if (data.getId() != null && !data.getId().isEmpty()) {
            try {
                UUID deckId = UUID.fromString(data.getId());
                // Update existing - trust mobile's UUID
                deck = deckRepository.findById(deckId)
                    .orElseGet(() -> {
                        // Mobile has UUID but server doesn't - create with mobile's UUID
                        Deck newDeck = new Deck();
                        newDeck.setId(deckId);
                        newDeck.setUserId(userId);
                        return newDeck;
                    });
                
                // Security check
                if (deck.getId() != null && !deck.getUserId().equals(userId)) {
                    throw new UnauthorizedException("Cannot update deck owned by another user");
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid UUID for deck: {}", data.getId());
                throw new RuntimeException("Invalid deck ID format: " + data.getId());
            }
        } else {
            // Create new - let database generate UUID
            deck = new Deck();
            deck.setUserId(userId);
        }

        // Convert folderId from String to UUID
        if (data.getFolderId() != null && !data.getFolderId().isEmpty()) {
            try {
                deck.setFolderId(UUID.fromString(data.getFolderId()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid UUID for folderId: {}", data.getFolderId());
                deck.setFolderId(null);
            }
        } else {
            deck.setFolderId(null);
        }
        
        deck.setTitle(data.getTitle());
        deck.setDescription(data.getDescription());
        
        if (data.getSourceType() != null) {
            deck.setSourceType(SourceType.valueOf(data.getSourceType()));
        }
        
        deck.setSourceId(data.getSourceId());
        
        // Handle soft delete based on deletedAt timestamp
        if (data.getDeletedAt() != null) {
            deck.setDeletedAt(data.getDeletedAt());
        } else {
            deck.setDeletedAt(null);  // Restore if previously deleted
        }
        
        deck.setLastViewedAt(data.getLastViewedAt());

        return deckRepository.save(deck);
    }

    private Card saveCardFromPush(UUID userId, SyncPushRequest.CardPushData data) {
        // Convert and verify deckId
        UUID deckId;
        try {
            deckId = UUID.fromString(data.getDeckId());
        } catch (IllegalArgumentException e) {
            log.error("Invalid UUID for deckId: {}", data.getDeckId());
            throw new RuntimeException("Invalid deck ID format: " + data.getDeckId());
        }
        
        // Verify deck ownership
        Deck deck = deckRepository.findById(deckId)
            .orElseThrow(() -> new RuntimeException("Deck not found: " + data.getDeckId()));
        
        if (!deck.getUserId().equals(userId)) {
            throw new UnauthorizedException("Cannot add card to deck owned by another user");
        }

        Card card;
        if (data.getId() != null && !data.getId().isEmpty()) {
            try {
                UUID cardId = UUID.fromString(data.getId());
                // Update existing - trust mobile's UUID
                card = cardRepository.findById(cardId)
                    .orElseGet(() -> {
                        // Mobile has UUID but server doesn't - create with mobile's UUID
                        Card newCard = new Card();
                        newCard.setId(cardId);
                        return newCard;
                    });
                
                // Verify ownership via deck
                if (card.getDeckId() != null) {
                    Deck existingDeck = deckRepository.findById(card.getDeckId())
                        .orElseThrow(() -> new RuntimeException("Deck not found for card"));
                    
                    if (!existingDeck.getUserId().equals(userId)) {
                        throw new UnauthorizedException("Cannot update card in deck owned by another user");
                    }
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid UUID for card: {}", data.getId());
                throw new RuntimeException("Invalid card ID format: " + data.getId());
            }
        } else {
            // Create new - let database generate UUID
            card = new Card();
        }

        card.setDeckId(deckId);
        card.setTerm(data.getTerm());
        card.setDefinition(data.getDefinition());
        card.setExample(data.getExample());
        card.setImageUrl(data.getImageUrl());
        card.setAudioUrl(data.getAudioUrl());
        card.setPosition(data.getPosition() != null ? data.getPosition() : 0);
        card.setTags(data.getTags());
        card.setSourceCardId(data.getSourceCardId());
        card.setIsStarred(data.getIsStarred() != null ? data.getIsStarred() : false);
        
        // Handle soft delete based on deletedAt timestamp
        if (data.getDeletedAt() != null) {
            card.setDeletedAt(data.getDeletedAt());
        } else {
            card.setDeletedAt(null);  // Restore if previously deleted
        }

        return cardRepository.save(card);
    }

    private StudyLog saveStudyLogFromPush(UUID userId, SyncPushRequest.StudyLogPushData data) {
        // Convert cardId from String to UUID
        UUID cardId;
        try {
            cardId = UUID.fromString(data.getCardId());
        } catch (IllegalArgumentException e) {
            log.error("Invalid UUID for cardId: {}", data.getCardId());
            throw new RuntimeException("Invalid card ID format: " + data.getCardId());
        }
        
        // Verify card ownership
        Card card = cardRepository.findById(cardId)
            .orElseThrow(() -> new RuntimeException("Card not found: " + data.getCardId()));
        
        Deck deck = deckRepository.findById(card.getDeckId())
            .orElseThrow(() -> new RuntimeException("Deck not found for card"));
        
        if (!deck.getUserId().equals(userId)) {
            throw new UnauthorizedException("Cannot add study log for card owned by another user");
        }

        StudyLog log = new StudyLog();
        log.setUserId(userId);
        log.setCardId(cardId);
        
        if (data.getGrade() != null) {
            log.setGrade(Grade.valueOf(data.getGrade()));
        }
        
        log.setAction(data.getAction());
        log.setTimeTakenMs(data.getTimeTakenMs());
        
        // Use provided reviewedAt or current time
        // Note: @CreationTimestamp will override this, so we need to handle it differently
        // For now, let CreationTimestamp handle it

        return studyLogRepository.save(log);
    }

    private CardProgress saveCardProgressFromPush(UUID userId, SyncPushRequest.CardProgressPushData data) {
        // Convert cardId from String to UUID
        UUID cardId;
        try {
            cardId = UUID.fromString(data.getCardId());
        } catch (IllegalArgumentException e) {
            log.error("Invalid UUID for cardId: {}", data.getCardId());
            throw new RuntimeException("Invalid card ID format: " + data.getCardId());
        }
        
        // Verify card ownership
        Card card = cardRepository.findById(cardId)
            .orElseThrow(() -> new RuntimeException("Card not found: " + data.getCardId()));
        
        Deck deck = deckRepository.findById(card.getDeckId())
            .orElseThrow(() -> new RuntimeException("Deck not found for card"));
        
        if (!deck.getUserId().equals(userId)) {
            throw new UnauthorizedException("Cannot update card progress for card owned by another user");
        }

        CardProgress progress;
        if (data.getId() != null && !data.getId().isEmpty()) {
            try {
                UUID progressId = UUID.fromString(data.getId());
                // Update existing - trust mobile's UUID
                progress = cardProgressRepository.findById(progressId)
                    .orElseGet(() -> {
                        // Mobile has UUID but server doesn't - create with mobile's UUID
                        CardProgress newProgress = new CardProgress();
                        newProgress.setId(progressId);
                        newProgress.setUserId(userId);
                        newProgress.setCardId(cardId);
                        return newProgress;
                    });
                
                if (progress.getId() != null && !progress.getUserId().equals(userId)) {
                    throw new UnauthorizedException("Cannot update card progress owned by another user");
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid UUID for card progress: {}", data.getId());
                throw new RuntimeException("Invalid card progress ID format: " + data.getId());
            }
        } else {
            // Check if progress already exists for this user-card combination
            progress = cardProgressRepository.findByUserIdAndCardId(userId, cardId)
                .orElseGet(() -> {
                    CardProgress newProgress = new CardProgress();
                    newProgress.setUserId(userId);
                    newProgress.setCardId(cardId);
                    return newProgress;
                });
        }

        if (data.getLearningState() != null) {
            progress.setLearningState(LearningState.valueOf(data.getLearningState()));
        }
        
        progress.setNextReview(data.getNextReview());
        progress.setInterval(data.getInterval() != null ? data.getInterval() : 0);
        progress.setEaseFactor(data.getEaseFactor() != null ? data.getEaseFactor() : 2.5f);
        progress.setRepetitions(data.getRepetitions() != null ? data.getRepetitions() : 0);

        return cardProgressRepository.save(progress);
    }
}
