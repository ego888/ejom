import React from "react";
import { jwtDecode } from "jwt-decode";
import DTRAttendanceOverview from "./DTRAttendanceOverview";

const DTRDashboard = () => {
  const decoded = jwtDecode(localStorage.getItem("token"));
  const isAdmin = decoded.categoryId === 1;
  const permissions = Array.isArray(decoded.dtrPermissions) ? decoded.dtrPermissions : [];
  const canAnalyze = isAdmin || ["dtr.batches", "dtr.monthly", "dtr.absences"].some((key) => permissions.includes(key));
  return canAnalyze ? <DTRAttendanceOverview /> : null;
};

export default DTRDashboard;
