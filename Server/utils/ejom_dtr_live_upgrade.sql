-- eJOM DTR consolidated live upgrade
-- MySQL 8.x / phpMyAdmin
-- This script creates or upgrades only DTR-related structures. It does not
-- delete, truncate, or replace existing employee or attendance data.

-- 1. Employee-to-DTR identity mapping
DROP PROCEDURE IF EXISTS upgrade_ejom_employee_dtr_id;
DELIMITER $$
CREATE PROCEDURE upgrade_ejom_employee_dtr_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employee'
      AND COLUMN_NAME = 'dtrEmpId'
  ) THEN
    ALTER TABLE employee
      ADD COLUMN dtrEmpId VARCHAR(10) NULL AFTER id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employee'
      AND INDEX_NAME = 'uq_employee_dtr_emp_id'
  ) THEN
    ALTER TABLE employee
      ADD UNIQUE KEY uq_employee_dtr_emp_id (dtrEmpId);
  END IF;
END$$
DELIMITER ;

CALL upgrade_ejom_employee_dtr_id();
DROP PROCEDURE upgrade_ejom_employee_dtr_id;

-- 2. Shift templates
CREATE TABLE IF NOT EXISTS DTRShiftTemplates (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  timeIn TIME NOT NULL,
  timeOut TIME NOT NULL,
  amBreakMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  mealBreakStart TIME NULL,
  mealBreakEnd TIME NULL,
  pmBreakMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  breakMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  graceMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  standardMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 480,
  color VARCHAR(20) NOT NULL DEFAULT '#0d6efd',
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdBy INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dtr_shift_name (name),
  CONSTRAINT fk_dtr_shift_created_by
    FOREIGN KEY (createdBy) REFERENCES employee(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Upgrade an existing shift table created by an earlier DTR version.
DROP PROCEDURE IF EXISTS upgrade_ejom_dtr_shift_columns;
DELIMITER $$
CREATE PROCEDURE upgrade_ejom_dtr_shift_columns()
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

CALL upgrade_ejom_dtr_shift_columns();
DROP PROCEDURE upgrade_ejom_dtr_shift_columns;

-- 3. Shift groups, date-range assignments, and employee overrides
CREATE TABLE IF NOT EXISTS DTRShiftGroups (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#6c757d',
  active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dtr_shift_group_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS DTRShiftGroupMembers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  groupId INT NOT NULL,
  employeeId INT NOT NULL,
  effectiveFrom DATE NOT NULL,
  effectiveUntil DATE NULL,
  PRIMARY KEY (id),
  KEY idx_group_member_dates (employeeId, effectiveFrom, effectiveUntil),
  CONSTRAINT fk_dtr_group_member_group FOREIGN KEY (groupId)
    REFERENCES DTRShiftGroups(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtr_group_member_employee FOREIGN KEY (employeeId)
    REFERENCES employee(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS DTRShiftAssignments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  groupId INT NULL,
  employeeId INT NULL,
  shiftId INT NOT NULL,
  dateFrom DATE NOT NULL,
  dateTo DATE NOT NULL,
  weekdaysMask TINYINT UNSIGNED NOT NULL DEFAULT 127,
  createdBy INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_shift_assignment_dates (dateFrom, dateTo),
  CONSTRAINT fk_dtr_assignment_group FOREIGN KEY (groupId)
    REFERENCES DTRShiftGroups(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtr_assignment_employee FOREIGN KEY (employeeId)
    REFERENCES employee(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtr_assignment_shift FOREIGN KEY (shiftId)
    REFERENCES DTRShiftTemplates(id),
  CONSTRAINT fk_dtr_assignment_creator FOREIGN KEY (createdBy)
    REFERENCES employee(id) ON DELETE SET NULL,
  CONSTRAINT chk_dtr_assignment_target CHECK (
    (groupId IS NOT NULL AND employeeId IS NULL) OR
    (groupId IS NULL AND employeeId IS NOT NULL)
  ),
  CONSTRAINT chk_dtr_assignment_dates CHECK (dateTo >= dateFrom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS DTRScheduleOverrides (
  id BIGINT NOT NULL AUTO_INCREMENT,
  employeeId INT NOT NULL,
  workDate DATE NOT NULL,
  shiftId INT NULL,
  scheduleType ENUM('WORK', 'REST', 'LEAVE', 'NO_WORK') NOT NULL DEFAULT 'WORK',
  notes VARCHAR(255) NULL,
  createdBy INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dtr_override_employee_date (employeeId, workDate),
  CONSTRAINT fk_dtr_override_employee FOREIGN KEY (employeeId)
    REFERENCES employee(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtr_override_shift FOREIGN KEY (shiftId)
    REFERENCES DTRShiftTemplates(id),
  CONSTRAINT fk_dtr_override_creator FOREIGN KEY (createdBy)
    REFERENCES employee(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Schedule exception and partial approval records
CREATE TABLE IF NOT EXISTS DTRScheduleExceptions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  batchId INT NOT NULL,
  dtrEntryId INT NOT NULL,
  employeeId INT NOT NULL,
  workDate DATE NOT NULL,
  exceptionType ENUM('EARLY_IN','LATE_OUT','REST_DAY_WORK','NO_SCHEDULE') NOT NULL,
  scheduledTime TIME NULL,
  actualTime TIME NULL,
  availableMinutes SMALLINT UNSIGNED NOT NULL,
  approvedMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('PENDING','APPROVED') NOT NULL DEFAULT 'PENDING',
  reviewedBy INT NULL,
  reviewedAt DATETIME NULL,
  reviewNotes VARCHAR(255) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dtr_entry_exception (dtrEntryId, exceptionType),
  KEY idx_dtr_exception_batch_status (batchId, status),
  CONSTRAINT fk_dtr_exception_batch FOREIGN KEY (batchId)
    REFERENCES DTRBatches(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtr_exception_entry FOREIGN KEY (dtrEntryId)
    REFERENCES DTREntries(id) ON DELETE CASCADE,
  CONSTRAINT fk_dtr_exception_employee FOREIGN KEY (employeeId)
    REFERENCES employee(id),
  CONSTRAINT fk_dtr_exception_reviewer FOREIGN KEY (reviewedBy)
    REFERENCES employee(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Per-employee DTR submenu permissions
CREATE TABLE IF NOT EXISTS EmployeeDTRPermissions (
  employeeId INT NOT NULL,
  permissionKey VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employeeId, permissionKey),
  CONSTRAINT fk_employee_dtr_permissions_employee
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

