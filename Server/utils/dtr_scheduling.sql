-- Run once in phpMyAdmin after dtr_shift_templates.sql.
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
