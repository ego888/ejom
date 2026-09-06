import React from "react";
import { Outlet } from "react-router-dom";
import "./DTRModuleLayout.css";

const DTRModuleLayout = () => (
  <div className="dtr-module">
    <header className="dtr-module-header">
      <div>
        <h2>Daily Time Record</h2>
        <p>Attendance, employee schedules, approvals, and reports</p>
      </div>
    </header>
    <main className="dtr-module-content"><Outlet /></main>
  </div>
);

export default DTRModuleLayout;
