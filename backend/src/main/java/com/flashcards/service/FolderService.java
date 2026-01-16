package com.flashcards.service;

import com.flashcards.dto.request.CreateFolderRequest;
import com.flashcards.dto.request.UpdateFolderRequest;
import com.flashcards.dto.response.DeckResponse;
import com.flashcards.dto.response.FolderResponse;
import com.flashcards.exception.FolderNotFoundException;
import com.flashcards.exception.UnauthorizedException;
import com.flashcards.model.entity.Deck;
import com.flashcards.model.entity.Folder;
import com.flashcards.model.entity.User;
import com.flashcards.repository.DeckRepository;
import com.flashcards.repository.FolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Folder Service
 * Business logic for folder management
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FolderService {
    
    private final FolderRepository folderRepository;
    private final DeckRepository deckRepository;
    private final DeckService deckService;
    
    /**
     * Create a new folder
     */
    @Transactional
    public FolderResponse createFolder(User user, CreateFolderRequest request) {
        log.info("Creating folder: name={}, userId={}", request.getName(), user.getId());
        
        Folder folder = Folder.builder()
                .name(request.getName())
                .description(request.getDescription())
                .userId(user.getId())
                .isDeleted(false)
                .build();
        
        Folder savedFolder = folderRepository.save(folder);
        log.info("Folder created: id={}, name={}", savedFolder.getId(), savedFolder.getName());
        
        return toFolderResponse(savedFolder, false);
    }
    
    /**
     * Get all folders for a user
     */
    @Transactional(readOnly = true)
    public List<FolderResponse> getAllFolders(User user, boolean includeDecks) {
        log.info("Fetching folders for user: userId={}", user.getId());
        
        List<Folder> folders = folderRepository.findByUserId(user.getId());
        
        return folders.stream()
                .map(folder -> toFolderResponse(folder, includeDecks))
                .collect(Collectors.toList());
    }
    
    /**
     * Get folder by ID
     */
    @Transactional(readOnly = true)
    public FolderResponse getFolderById(User user, Long folderId, boolean includeDecks) {
        log.info("Fetching folder: folderId={}, userId={}", folderId, user.getId());
        
        Folder folder = verifyFolderOwnership(user.getId(), folderId);
        
        return toFolderResponse(folder, includeDecks);
    }
    
    /**
     * Update folder
     */
    @Transactional
    public FolderResponse updateFolder(User user, Long folderId, UpdateFolderRequest request) {
        log.info("Updating folder: folderId={}, name={}", folderId, request.getName());
        
        Folder folder = verifyFolderOwnership(user.getId(), folderId);
        
        folder.setName(request.getName());
        folder.setDescription(request.getDescription());
        
        Folder updatedFolder = folderRepository.save(folder);
        log.info("Folder updated: id={}, name={}", updatedFolder.getId(), updatedFolder.getName());
        
        return toFolderResponse(updatedFolder, false);
    }
    
    /**
     * Delete folder (soft delete)
     * Decks inside will be moved to uncategorized (folderId = null)
     */
    @Transactional
    public void deleteFolder(User user, Long folderId) {
        log.info("Deleting folder: folderId={}, userId={}", folderId, user.getId());
        
        Folder folder = verifyFolderOwnership(user.getId(), folderId);
        
        // Move all decks out of this folder
        List<Deck> decksInFolder = deckRepository.findByFolderIdAndUserId(folderId, user.getId());
        for (Deck deck : decksInFolder) {
            deck.setFolderId(null);
            deckRepository.save(deck);
        }
        
        log.info("Moved {} decks out of folder {}", decksInFolder.size(), folderId);
        
        // Soft delete folder
        folder.setIsDeleted(true);
        folderRepository.save(folder);
        
        log.info("Folder deleted: id={}", folderId);
    }
    
    /**
     * Add deck to folder
     */
    @Transactional
    public void addDeckToFolder(User user, Long folderId, Long deckId) {
        log.info("Adding deck to folder: deckId={}, folderId={}", deckId, folderId);
        
        // Verify folder ownership
        verifyFolderOwnership(user.getId(), folderId);
        
        // Verify deck ownership
        Deck deck = deckRepository.findByIdAndUserId(deckId, user.getId())
                .orElseThrow(() -> new UnauthorizedException("Deck not found or access denied"));
        
        deck.setFolderId(folderId);
        deckRepository.save(deck);
        
        log.info("Deck added to folder: deckId={}, folderId={}", deckId, folderId);
    }
    
    /**
     * Remove deck from folder
     */
    @Transactional
    public void removeDeckFromFolder(User user, Long deckId) {
        log.info("Removing deck from folder: deckId={}", deckId);
        
        Deck deck = deckRepository.findByIdAndUserId(deckId, user.getId())
                .orElseThrow(() -> new UnauthorizedException("Deck not found or access denied"));
        
        deck.setFolderId(null);
        deckRepository.save(deck);
        
        log.info("Deck removed from folder: deckId={}", deckId);
    }
    
    /**
     * Get uncategorized decks (not in any folder)
     */
    @Transactional(readOnly = true)
    public List<DeckResponse> getUncategorizedDecks(User user) {
        log.info("Fetching uncategorized decks for user: userId={}", user.getId());
        
        List<Deck> decks = deckRepository.findByUserIdAndFolderIdIsNull(user.getId());
        
        return decks.stream()
                .map(deckService::toDeckResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Update folder last viewed timestamp
     * Uses native query to avoid triggering @UpdateTimestamp on updatedAt
     */
    @Transactional
    public void updateLastViewed(User user, Long folderId) {
        log.info("Updating folder last viewed: folderId={}, userId={}", folderId, user.getId());
        
        // Use native query to update only last_viewed_at without triggering updated_at
        int rowsUpdated = folderRepository.updateLastViewedAt(
            folderId, 
            user.getId(), 
            java.time.LocalDateTime.now()
        );
        
        if (rowsUpdated == 0) {
            log.warn("Failed to update last viewed: folderId={}, userId={}", folderId, user.getId());
            throw new FolderNotFoundException("Folder not found or access denied");
        }
        
        log.debug("Folder last viewed updated: folderId={}", folderId);
    }
    
    /**
     * Verify folder ownership
     */
    private Folder verifyFolderOwnership(Long userId, Long folderId) {
        return folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new FolderNotFoundException("Folder not found or access denied"));
    }
    
    /**
     * Convert Folder entity to FolderResponse
     */
    private FolderResponse toFolderResponse(Folder folder, boolean includeDecks) {
        FolderResponse.FolderResponseBuilder builder = FolderResponse.builder()
                .id(folder.getId())
                .name(folder.getName())
                .description(folder.getDescription())
                .userId(folder.getUserId())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .lastViewedAt(folder.getLastViewedAt());
        
        // Count decks in folder
        List<Deck> decksInFolder = deckRepository.findByFolderIdAndUserId(folder.getId(), folder.getUserId());
        builder.deckCount(decksInFolder.size());
        
        // Include decks if requested
        if (includeDecks) {
            List<DeckResponse> deckResponses = decksInFolder.stream()
                    .map(deckService::toDeckResponse)
                    .collect(Collectors.toList());
            builder.decks(deckResponses);
        }
        
        return builder.build();
    }
}
