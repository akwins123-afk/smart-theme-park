-- ====================================================================
-- MIGRATION 001: Add Pin_Hash to RFID_Wristband
-- Allows secure PIN authentication for customer self-service portal
-- Default PIN for demo accounts is '1234'
-- ====================================================================

USE smart_theme_park;

-- Add Pin_Hash column if it does not already exist
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'smart_theme_park' 
      AND TABLE_NAME = 'RFID_Wristband' 
      AND COLUMN_NAME = 'Pin_Hash'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE RFID_Wristband ADD COLUMN Pin_Hash VARCHAR(255) DEFAULT \"$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy\" AFTER Status', 
    'SELECT \"Column Pin_Hash already exists\"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing wristbands to have default PIN '1234' hash if null
UPDATE RFID_Wristband 
SET Pin_Hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' 
WHERE Pin_Hash IS NULL OR Pin_Hash = '';
