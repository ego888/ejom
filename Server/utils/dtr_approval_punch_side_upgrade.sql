-- Run once to support separate approval rows for unscheduled IN and OUT punches.
ALTER TABLE DTRScheduleExceptions
  DROP INDEX uq_dtr_entry_exception,
  ADD COLUMN punchSide ENUM('WINDOW','IN','OUT') NOT NULL DEFAULT 'WINDOW'
    AFTER exceptionType,
  ADD UNIQUE KEY uq_dtr_entry_exception (dtrEntryId, exceptionType, punchSide);
