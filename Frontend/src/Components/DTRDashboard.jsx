import React from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const items = [
  ["batches", "Process Attendance", "Import, analyze, review, and calculate DTR batches", "bi-folder2-open", "dtr.batches"],
  ["calendar", "Monthly Calendar", "Review resolved schedules for active employees", "bi-calendar3", "dtr.calendar"],
  ["assignments", "Assign Shifts", "Assign shifts by group, employee, and date range", "bi-calendar2-plus", "dtr.assignments"],
  ["groups", "Shift Groups", "Manage rotating employee groups and membership", "bi-people", "dtr.groups"],
  ["shifts", "Shift Templates", "Configure work times, meal breaks, and allowances", "bi-clock", "dtr.shifts"],
  ["holidays", "Holidays", "Maintain regular and special holidays", "bi-calendar2-week", "dtr.holidays"],
];

const DTRDashboard = () => {
  const decoded = jwtDecode(localStorage.getItem("token"));
  const isAdmin = decoded.categoryId === 1;
  const permissions = Array.isArray(decoded.dtrPermissions) ? decoded.dtrPermissions : [];
  const visibleItems = items.filter((item) => isAdmin || permissions.includes(item[4]));
  return <div className="row g-3">
  {visibleItems.map(([path, title, description, icon]) => <div className="col-md-6 col-xl-4" key={path}>
    <Link to={path} className="card h-100 text-decoration-none text-dark">
      <div className="card-body"><i className={`bi ${icon} fs-3 text-primary`} /><h5 className="mt-2">{title}</h5><p className="text-muted mb-0">{description}</p></div>
    </Link>
  </div>)}
</div>;
};

export default DTRDashboard;
