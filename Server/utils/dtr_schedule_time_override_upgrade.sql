-- Run once on existing databases before deploying schedule time overrides.
ALTER TABLE DTRScheduleOverrides
  ADD COLUMN timeIn TIME NULL,
  ADD COLUMN timeOut TIME NULL;
