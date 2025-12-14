-- Migration script to update lecture status enum values
-- Run this script BEFORE starting the application if you have existing data with old status values

-- Step 1: Convert enum column to VARCHAR temporarily
ALTER TABLE lectures MODIFY COLUMN status VARCHAR(50);

-- Step 2: Update old status values to new ones
UPDATE lectures SET status = 'INFO_INPUT' WHERE status = 'DRAFT';
UPDATE lectures SET status = 'SLIDE_UPLOAD' WHERE status = 'PROCESSING';
UPDATE lectures SET status = 'SLIDE_UPLOAD' WHERE status = 'UPLOADED';
UPDATE lectures SET status = 'SLIDE_UPLOAD' WHERE status = 'READY';
UPDATE lectures SET status = 'COMPLETED' WHERE status = 'PUBLISHED';
UPDATE lectures SET status = 'INFO_INPUT' WHERE status = 'FAILED';

-- Step 3: Convert back to enum with new values
ALTER TABLE lectures MODIFY COLUMN status ENUM('INFO_INPUT', 'SLIDE_UPLOAD', 'RECORDING', 'ANALYZING', 'COMPLETED') NOT NULL;

