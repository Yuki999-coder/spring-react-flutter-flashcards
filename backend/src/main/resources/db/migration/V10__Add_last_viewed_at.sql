-- Migration V10: Add last_viewed_at to folders and decks tables
-- This column tracks when user last clicked to view the folder/deck

-- Add last_viewed_at to folders table
ALTER TABLE folders
ADD COLUMN last_viewed_at TIMESTAMP;

-- Add last_viewed_at to decks table  
ALTER TABLE decks
ADD COLUMN last_viewed_at TIMESTAMP;

-- Add indexes for better query performance
CREATE INDEX idx_folders_last_viewed_at ON folders(last_viewed_at DESC);
CREATE INDEX idx_decks_last_viewed_at ON decks(last_viewed_at DESC);

-- Create comment for documentation
COMMENT ON COLUMN folders.last_viewed_at IS 'Timestamp when user last clicked to view this folder';
COMMENT ON COLUMN decks.last_viewed_at IS 'Timestamp when user last clicked to view this deck';
