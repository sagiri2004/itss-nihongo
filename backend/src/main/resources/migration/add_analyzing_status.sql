-- Migration script to add ANALYZING status to lectures table
-- Run this script to update the enum column to include ANALYZING status

-- Step 1: Convert enum to VARCHAR temporarily to allow modification
ALTER TABLE lectures MODIFY COLUMN status VARCHAR(50);

-- Step 2: Update the column back to ENUM with ANALYZING included
ALTER TABLE lectures MODIFY COLUMN status ENUM('INFO_INPUT', 'SLIDE_UPLOAD', 'RECORDING', 'ANALYZING', 'COMPLETED') NOT NULL;


