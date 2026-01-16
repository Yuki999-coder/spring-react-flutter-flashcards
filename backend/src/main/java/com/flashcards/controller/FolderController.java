package com.flashcards.controller;

import com.flashcards.dto.request.CreateFolderRequest;
import com.flashcards.dto.request.UpdateFolderRequest;
import com.flashcards.dto.response.DeckResponse;
import com.flashcards.dto.response.FolderResponse;
import com.flashcards.model.entity.User;
import com.flashcards.security.CustomUserDetailsService;
import com.flashcards.service.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Folder Controller
 * REST API endpoints for folder management
 */
@RestController
@RequestMapping("/api/v1/folders")
@RequiredArgsConstructor
@Slf4j
public class FolderController {
    
    private final FolderService folderService;
    private final CustomUserDetailsService userDetailsService;
    
    /**
     * Create a new folder
     * POST /api/v1/folders
     */
    @PostMapping
    public ResponseEntity<FolderResponse> createFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateFolderRequest request) {
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/folders - Creating folder: user={}, name={}", 
                user.getId(), request.getName());
        
        FolderResponse response = folderService.createFolder(user, request);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Get all folders for current user
     * GET /api/v1/folders?includeDecks=true
     */
    @GetMapping
    public ResponseEntity<List<FolderResponse>> getAllFolders(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "false") boolean includeDecks) {
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/folders - Fetching folders: user={}, includeDecks={}", 
                user.getId(), includeDecks);
        
        List<FolderResponse> folders = folderService.getAllFolders(user, includeDecks);
        
        return ResponseEntity.ok(folders);
    }
    
    /**
     * Get folder by ID
     * GET /api/v1/folders/{id}?includeDecks=true
     */
    @GetMapping("/{id}")
    public ResponseEntity<FolderResponse> getFolderById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean includeDecks) {
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/folders/{} - Fetching folder: user={}", id, user.getId());
        
        FolderResponse folder = folderService.getFolderById(user, id, includeDecks);
        
        return ResponseEntity.ok(folder);
    }
    
    /**
     * Update folder
     * PUT /api/v1/folders/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<FolderResponse> updateFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateFolderRequest request) {
        User user = getCurrentUser(userDetails);
        log.info("PUT /api/v1/folders/{} - Updating folder: user={}", id, user.getId());
        
        FolderResponse response = folderService.updateFolder(user, id, request);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Delete folder (soft delete, decks moved to uncategorized)
     * DELETE /api/v1/folders/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        User user = getCurrentUser(userDetails);
        log.info("DELETE /api/v1/folders/{} - Deleting folder: user={}", id, user.getId());
        
        folderService.deleteFolder(user, id);
        
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Add deck to folder
     * POST /api/v1/folders/{folderId}/decks/{deckId}
     */
    @PostMapping("/{folderId}/decks/{deckId}")
    public ResponseEntity<Void> addDeckToFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long folderId,
            @PathVariable Long deckId) {
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/folders/{}/decks/{} - Adding deck to folder: user={}", 
                folderId, deckId, user.getId());
        
        folderService.addDeckToFolder(user, folderId, deckId);
        
        return ResponseEntity.ok().build();
    }
    
    /**
     * Remove deck from folder (move to uncategorized)
     * DELETE /api/v1/folders/decks/{deckId}
     */
    @DeleteMapping("/decks/{deckId}")
    public ResponseEntity<Void> removeDeckFromFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long deckId) {
        User user = getCurrentUser(userDetails);
        log.info("DELETE /api/v1/folders/decks/{} - Removing deck from folder: user={}", 
                deckId, user.getId());
        
        folderService.removeDeckFromFolder(user, deckId);
        
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Update folder last viewed timestamp
     * POST /api/v1/folders/{id}/view
     */
    @PostMapping("/{id}/view")
    public ResponseEntity<Void> updateFolderLastViewed(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        User user = getCurrentUser(userDetails);
        log.info("POST /api/v1/folders/{}/view - Updating last viewed: user={}", id, user.getId());
        
        folderService.updateLastViewed(user, id);
        
        return ResponseEntity.ok().build();
    }
    
    /**
     * Get uncategorized decks (not in any folder)
     * GET /api/v1/folders/uncategorized
     */
    @GetMapping("/uncategorized")
    public ResponseEntity<List<DeckResponse>> getUncategorizedDecks(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        log.info("GET /api/v1/folders/uncategorized - Fetching uncategorized decks: user={}", 
                user.getId());
        
        List<DeckResponse> decks = folderService.getUncategorizedDecks(user);
        
        return ResponseEntity.ok(decks);
    }
    
    /**
     * Helper method to get current user from UserDetails
     */
    private User getCurrentUser(UserDetails userDetails) {
        return userDetailsService.getUserByEmail(userDetails.getUsername());
    }
}
