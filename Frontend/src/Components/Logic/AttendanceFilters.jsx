import React from "react";
import Input from "../UI/Input";
import Dropdown from "../UI/Dropdown";

const AttendanceFilters = ({ filters, onChange, options, maxDate }) => {
  const update = (key) => (event) => onChange({ ...filters, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  return <div className="card mb-3"><div className="card-body">
    <div className="row g-3">
      <div className="col-sm-6 col-xl-3"><Input id="attendance-from" type="date" label="From" value={filters.dateFrom} max={maxDate} onChange={update("dateFrom")} /></div>
      <div className="col-sm-6 col-xl-3"><Input id="attendance-to" type="date" label="Through" value={filters.dateTo} min={filters.dateFrom} max={maxDate} onChange={update("dateTo")} /></div>
      <div className="col-sm-6 col-xl-3"><Dropdown id="attendance-employee" className="form-select" label="Employee" placeholder="All employees" options={options.employees} value={filters.employeeId} onChange={update("employeeId")} /></div>
      <div className="col-sm-6 col-xl-3"><Dropdown id="attendance-group" className="form-select" label="Shift group" placeholder="All groups" options={options.groups} value={filters.groupId} onChange={update("groupId")} /></div>
    </div>
    <div className="d-flex flex-wrap gap-4 mt-3">
      {[["includeSundays", "Include Sundays"], ["includeHolidays", "Include holidays"]].map(([key, label]) =>
        <div className="form-check form-switch" key={key}>
          <input className="form-check-input" role="switch" type="checkbox" id={`attendance-${key}`} checked={filters[key]} onChange={update(key)} />
          <label className="form-check-label" htmlFor={`attendance-${key}`}>{label}</label>
        </div>)}
    </div>
    <p className="small text-muted mb-0 mt-2">Both switches apply to every metric. A holiday that falls on Sunday requires both switches. Group membership is checked on each work date.</p>
  </div></div>;
};

export default AttendanceFilters;
