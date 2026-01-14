package com.flashcards.service;

import com.flashcards.dto.request.CreateCardRequest;
import com.flashcards.dto.request.ImportCardsRequest;
import com.flashcards.dto.response.CardResponse;
import com.flashcards.dto.response.ImportResultDTO;
import com.flashcards.model.entity.Card;
import com.flashcards.model.entity.Deck;
import com.flashcards.model.entity.User;
import com.flashcards.repository.CardRepository;
import com.flashcards.repository.DeckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportExportService {
    
    private final CardRepository cardRepository;
    private final DeckRepository deckRepository;
    private final CardService cardService;
    
    /**
     * Import cards from text content
     * Supports multiple delimiters: Tab, Comma, Semicolon
     */
    @Transactional
    public ImportResultDTO importCards(User user, Long deckId, ImportCardsRequest request) {
        // Verify deck ownership
        Deck deck = deckRepository.findByIdAndUserId(deckId, user.getId())
                .orElseThrow(() -> new RuntimeException("Deck not found or access denied"));
        
        List<CardResponse> importedCards = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int totalLines = 0;
        int successCount = 0;
        
        // Split by lines
        String[] lines = request.getContent().split("\\r?\\n");
        totalLines = lines.length;
        
        // Auto-detect delimiter if not specified
        String delimiter = detectDelimiter(request.getContent(), request.getDelimiter());
        log.info("Using delimiter: {}", delimiter);
        
        // Get current max position
        int currentPosition = cardRepository.findAllByDeckIdAndDeckUserIdOrderByPositionAsc(deckId, user.getId())
                .stream()
                .mapToInt(Card::getPosition)
                .max()
                .orElse(-1);
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            
            // Skip empty lines
            if (line.isEmpty()) {
                totalLines--;
                continue;
            }
            
            try {
                // Split by delimiter
                String[] parts = line.split(Pattern.quote(delimiter), 2);
                
                if (parts.length < 2) {
                    errors.add("Line " + (i + 1) + ": Invalid format - missing delimiter");
                    continue;
                }
                
                String term = parts[0].trim();
                String definition = parts[1].trim();
                
                if (term.isEmpty() || definition.isEmpty()) {
                    errors.add("Line " + (i + 1) + ": Term or definition is empty");
                    continue;
                }
                
                // Create card using CardService
                CreateCardRequest cardRequest = CreateCardRequest.builder()
                        .deckId(deckId)
                        .term(term)
                        .definition(definition)
                        .build();
                
                CardResponse card = cardService.addCardToDeck(user, cardRequest);
                importedCards.add(card);
                successCount++;
                
            } catch (Exception e) {
                errors.add("Line " + (i + 1) + ": " + e.getMessage());
                log.error("Failed to import line {}: {}", i + 1, e.getMessage());
            }
        }
        
        log.info("Import completed: {} success, {} failed out of {} lines", 
                successCount, errors.size(), totalLines);
        
        return ImportResultDTO.builder()
                .totalLines(totalLines)
                .successCount(successCount)
                .failedCount(errors.size())
                .errors(errors)
                .importedCards(importedCards)
                .build();
    }
    
    /**
     * Export cards to CSV format
     */
    public String exportToCSV(User user, Long deckId) {
        // Verify deck ownership
        Deck deck = deckRepository.findByIdAndUserId(deckId, user.getId())
                .orElseThrow(() -> new RuntimeException("Deck not found or access denied"));
        
        List<Card> cards = cardRepository.findAllByDeckIdAndDeckUserIdOrderByPositionAsc(deckId, user.getId());
        
        StringBuilder csv = new StringBuilder();
        
        // Add header
        csv.append("Term,Definition,Example\n");
        
        // Add cards
        for (Card card : cards) {
            csv.append(escapeCsv(card.getTerm())).append(",");
            csv.append(escapeCsv(card.getDefinition())).append(",");
            csv.append(escapeCsv(card.getExample() != null ? card.getExample() : "")).append("\n");
        }
        
        log.info("Exported {} cards from deck {}", cards.size(), deckId);
        return csv.toString();
    }
    
    /**
     * Export cards to Quizlet format (Tab-delimited)
     */
    public String exportToQuizlet(User user, Long deckId) {
        // Verify deck ownership
        Deck deck = deckRepository.findByIdAndUserId(deckId, user.getId())
                .orElseThrow(() -> new RuntimeException("Deck not found or access denied"));
        
        List<Card> cards = cardRepository.findAllByDeckIdAndDeckUserIdOrderByPositionAsc(deckId, user.getId());
        
        StringBuilder text = new StringBuilder();
        
        // Quizlet format: Term [TAB] Definition
        for (Card card : cards) {
            text.append(stripHtml(card.getTerm()))
                .append("\t")
                .append(stripHtml(card.getDefinition()))
                .append("\n");
        }
        
        log.info("Exported {} cards to Quizlet format from deck {}", cards.size(), deckId);
        return text.toString();
    }
    
    /**
     * Detect delimiter from content
     */
    private String detectDelimiter(String content, String preferredDelimiter) {
        if (preferredDelimiter != null && !preferredDelimiter.isEmpty()) {
            switch (preferredDelimiter.toLowerCase()) {
                case "tab":
                    return "\t";
                case "comma":
                    return ",";
                case "semicolon":
                    return ";";
                case "pipe":
                    return "|";
            }
        }
        
        // Auto-detect: check first non-empty line
        String[] lines = content.split("\\r?\\n");
        for (String line : lines) {
            if (!line.trim().isEmpty()) {
                // Count delimiters
                int tabCount = countOccurrences(line, '\t');
                int commaCount = countOccurrences(line, ',');
                int semicolonCount = countOccurrences(line, ';');
                int pipeCount = countOccurrences(line, '|');
                
                // Return most common delimiter
                if (tabCount > 0) return "\t";
                if (pipeCount > 0) return "|";
                if (semicolonCount > 0) return ";";
                if (commaCount > 0) return ",";
            }
        }
        
        // Default to tab
        return "\t";
    }
    
    private int countOccurrences(String str, char ch) {
        return (int) str.chars().filter(c -> c == ch).count();
    }
    
    /**
     * Escape CSV special characters
     */
    private String escapeCsv(String value) {
        if (value == null) return "";
        
        // Strip HTML tags
        value = stripHtml(value);
        
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            value = "\"" + value.replace("\"", "\"\"") + "\"";
        }
        
        return value;
    }
    
    /**
     * Strip HTML tags from text
     */
    private String stripHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]*>", "").trim();
    }
}
