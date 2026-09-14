-- Preserve originals on the first manual edit. Existing overwritten punches cannot be recovered.
-- Select the existing eJOM database before importing this MySQL 8 script.
DROP PROCEDURE IF EXISTS upgrade_ejom_manual_punches;
DELIMITER $$
CREATE PROCEDURE upgrade_ejom_manual_punches()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='DTREntries' AND COLUMN_NAME='originalTimeIn') THEN
    ALTER TABLE DTREntries ADD COLUMN originalTimeIn VARCHAR(20) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='DTREntries' AND COLUMN_NAME='originalTimeOut') THEN
    ALTER TABLE DTREntries ADD COLUMN originalTimeOut VARCHAR(20) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='DTREntries' AND COLUMN_NAME='originalPunchesCaptured') THEN
    ALTER TABLE DTREntries ADD COLUMN originalPunchesCaptured TINYINT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='DTREntries' AND COLUMN_NAME='manualIn') THEN
    ALTER TABLE DTREntries ADD COLUMN manualIn TINYINT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='DTREntries' AND COLUMN_NAME='manualOut') THEN
    ALTER TABLE DTREntries ADD COLUMN manualOut TINYINT NOT NULL DEFAULT 0;
  END IF;
END$$
DELIMITER ;
CALL upgrade_ejom_manual_punches();
DROP PROCEDURE upgrade_ejom_manual_punches;
