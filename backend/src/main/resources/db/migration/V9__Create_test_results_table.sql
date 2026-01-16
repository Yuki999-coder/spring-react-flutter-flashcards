-- V9: Create test_results table for storing practice test results

CREATE TABLE test_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    deck_id BIGINT NOT NULL,
    score DECIMAL(5, 2) NOT NULL, -- Percentage score (0-100)
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_test_results_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_results_deck FOREIGN KEY (deck_id) 
        REFERENCES decks(id) ON DELETE CASCADE,
    CONSTRAINT check_score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT check_counts_positive CHECK (
        correct_count >= 0 AND 
        wrong_count >= 0 AND 
        skipped_count >= 0 AND
        total_questions > 0
    )
);

-- Index for faster queries
CREATE INDEX idx_test_results_user_id ON test_results(user_id);
CREATE INDEX idx_test_results_deck_id ON test_results(deck_id);
CREATE INDEX idx_test_results_submitted_at ON test_results(submitted_at DESC);
CREATE INDEX idx_test_results_user_deck ON test_results(user_id, deck_id, submitted_at DESC);

COMMENT ON TABLE test_results IS 'Stores practice test results for analytics';
COMMENT ON COLUMN test_results.score IS 'Percentage score (0-100)';
COMMENT ON COLUMN test_results.duration_seconds IS 'Time taken to complete the test in seconds';
