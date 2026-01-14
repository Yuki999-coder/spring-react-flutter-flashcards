-- Drop tables if exist
DROP TABLE IF EXISTS study_log CASCADE;
DROP TABLE IF EXISTS card_progress CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS decks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. DECKS
CREATE TABLE decks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    source_id VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deck_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. CARDS
CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    deck_id BIGINT NOT NULL,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    example TEXT,
    image_url TEXT,
    audio_url TEXT,
    position INT NOT NULL DEFAULT 0,
    tags TEXT[],
    source_card_id VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

-- 4. CARD_PROGRESS
CREATE TABLE card_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    card_id BIGINT NOT NULL,
    learning_state VARCHAR(30) NOT NULL DEFAULT 'NEW',
    next_review TIMESTAMP,
    interval INT NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    repetitions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_card UNIQUE (user_id, card_id)
);

-- 5. STUDY_LOG
CREATE TABLE study_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    card_id BIGINT NOT NULL,
    grade VARCHAR(10) NOT NULL,
    action VARCHAR(20),
    time_taken_ms INT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- 6. INDEXES
CREATE INDEX idx_card_progress_due ON card_progress (user_id, next_review);
CREATE INDEX idx_cards_deck_position ON cards (deck_id, position);
CREATE INDEX idx_cards_updated ON cards (updated_at);
CREATE INDEX idx_decks_updated ON decks (updated_at);
