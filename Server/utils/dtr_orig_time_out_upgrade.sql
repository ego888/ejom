-- Select the existing eJOM database before importing.
-- Add only the original OUT punch. Do not backfill from editable timeOut values.
DROP PROCEDURE IF EXISTS upgrade_ejom_orig_time_out;
DELIMITER $$
CREATE PROCEDURE upgrade_ejom_orig_time_out()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='DTREntries' AND COLUMN_NAME='origTimeOut'
  ) THEN
    ALTER TABLE DTREntries ADD COLUMN origTimeOut VARCHAR(20) NULL AFTER time;
  END IF;
END$$
DELIMITER ;
CALL upgrade_ejom_orig_time_out();
DROP PROCEDURE upgrade_ejom_orig_time_out;
