-- Migration: Add Folder support
-- Created: 2026-01-15

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_folders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Add folder_id column to decks table
ALTER TABLE decks ADD COLUMN IF NOT EXISTS folder_id BIGINT;
ALTER TABLE decks ADD CONSTRAINT fk_decks_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_is_deleted ON folders(is_deleted);
CREATE INDEX IF NOT EXISTS idx_decks_folder_id ON decks(folder_id);
CREATE INDEX IF NOT EXISTS idx_decks_user_folder ON decks(user_id, folder_id);

-- 4. Comments for documentation
COMMENT ON TABLE folders IS 'Folders to organize decks';
COMMENT ON COLUMN folders.user_id IS 'Owner of the folder';
COMMENT ON COLUMN folders.is_deleted IS 'Soft delete flag';
COMMENT ON COLUMN decks.folder_id IS 'Parent folder (nullable - deck can exist without folder)';
