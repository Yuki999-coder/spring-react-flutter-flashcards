-- Migration: Add 'action' column to study_log table for statistics
-- This column tracks whether a study session was for learning or reviewing

ALTER TABLE study_log 
ADD COLUMN IF NOT EXISTS action VARCHAR(20);

-- Add comment
COMMENT ON COLUMN study_log.action IS 'Study action type: LEARN or REVIEW';
