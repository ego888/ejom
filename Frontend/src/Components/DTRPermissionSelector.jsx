import React from "react";

export const DTR_PERMISSION_OPTIONS = [
  ["dtr.batches", "Attendance Batches", "Includes schedule approvals"],
  ["dtr.import", "Import DTR", "Upload attendance files"],
  ["dtr.calendar", "Schedule Calendar", "View resolved schedules"],
  ["dtr.assignments", "Shift Assignments", "Assign shifts by date range"],
  ["dtr.groups", "Shift Groups", "Manage groups and membership"],
  ["dtr.shifts", "Shift Templates", "Manage shift definitions"],
  ["dtr.overrides", "Overrides", "Set employee date overrides"],
  ["dtr.holidays", "Holidays", "Manage holidays"],
  ["dtr.monthly", "Monthly Hours", "View monthly reports"],
  ["dtr.absences", "Absences", "View absence reports"],
];

const PRESETS = {
  full: DTR_PERMISSION_OPTIONS.map(([key]) => key),
  batch: ["dtr.batches", "dtr.import"],
  schedule: ["dtr.calendar", "dtr.assignments", "dtr.groups", "dtr.shifts", "dtr.overrides", "dtr.holidays"],
  reports: ["dtr.monthly", "dtr.absences"],
};

const DTRPermissionSelector = ({ value = [], onChange }) => {
  const selected = new Set(value);
  const toggle = (key) => onChange(
    selected.has(key) ? value.filter((item) => item !== key) : [...value, key],
  );

  return (
    <fieldset className="border rounded p-3">
      <legend className="float-none w-auto px-2 fs-6 mb-2">DTR Access</legend>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onChange(PRESETS.full)}>Full DTR Access</button>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onChange(PRESETS.batch)}>Batch Processor</button>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onChange(PRESETS.schedule)}>Schedule Manager</button>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onChange(PRESETS.reports)}>Reports Only</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange([])}>Clear</button>
      </div>
      <div className="row g-2">
        {DTR_PERMISSION_OPTIONS.map(([key, label, help]) => (
          <div className="col-md-6" key={key}>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id={`permission-${key}`} checked={selected.has(key)} onChange={() => toggle(key)} />
              <label className="form-check-label" htmlFor={`permission-${key}`}>
                {label}<small className="d-block text-muted">{help}</small>
              </label>
            </div>
          </div>
        ))}
      </div>
      <small className="text-muted d-block mt-2">Overview is automatically available when any DTR access is selected. Administrators always have full access.</small>
    </fieldset>
  );
};

export default DTRPermissionSelector;

