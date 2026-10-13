-- Run once on databases that already have DTRScheduleExceptions.
ALTER TABLE DTRScheduleExceptions
  ADD COLUMN approvedTime TIME NULL AFTER actualTime;
