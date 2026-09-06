-- Safe to run after any earlier version of the DTRShiftTemplates migration.
-- Legacy amBreak, pmBreak, or paidBreakMinutes columns are left untouched.
DROP PROCEDURE IF EXISTS upgrade_dtr_shift_columns;
DELIMITER $$
CREATE PROCEDURE upgrade_dtr_shift_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'DTRShiftTemplates'
      AND COLUMN_NAME = 'amBreakMinutes'
  ) THEN
    ALTER TABLE DTRShiftTemplates
      ADD COLUMN amBreakMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER timeOut;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'DTRShiftTemplates'
      AND COLUMN_NAME = 'mealBreakStart'
  ) THEN
    ALTER TABLE DTRShiftTemplates
      ADD COLUMN mealBreakStart TIME NULL AFTER amBreakMinutes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'DTRShiftTemplates'
      AND COLUMN_NAME = 'mealBreakEnd'
  ) THEN
    ALTER TABLE DTRShiftTemplates
      ADD COLUMN mealBreakEnd TIME NULL AFTER mealBreakStart;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'DTRShiftTemplates'
      AND COLUMN_NAME = 'pmBreakMinutes'
  ) THEN
    ALTER TABLE DTRShiftTemplates
      ADD COLUMN pmBreakMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER mealBreakEnd;
  END IF;
END$$
DELIMITER ;

CALL upgrade_dtr_shift_columns();
DROP PROCEDURE upgrade_dtr_shift_columns;
