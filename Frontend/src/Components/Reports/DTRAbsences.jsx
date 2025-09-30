import React, { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import AbsencesLineChart from "../UI/AbsencesLineChart";
import "./Reports.css";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatNumber = (value) => {
  if (value === null || value === undefined) return "";

  const rounded = Number(value.toFixed(2));
  return rounded === 0 ? "" : rounded.toFixed(2);
};

const DTRAbsences = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const yearOptions = useMemo(() => {
    const span = 6;
    return Array.from({ length: span }, (_, index) => currentYear - index);
  }, [currentYear]);

  const fetchAbsenceReport = async (selectedYear) => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/dtr/absences`, {
        params: { year: selectedYear },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data?.Status) {
        setReport(response.data.Result);
      } else {
        setReport(null);
        setError(response.data?.Error || "Failed to load DTR absence report.");
      }
    } catch (err) {
      console.error("Error fetching DTR absence report:", err);
      setReport(null);
      setError("Unable to load DTR absence report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsenceReport(year);
  }, [year]);

  const handleRefresh = () => {
    fetchAbsenceReport(year);
  };

  return (
    <div className="reports-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">DTR Absences ({year})</h3>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="dtr-absences-year" className="form-label mb-0">
            Year:
          </label>
          <select
            id="dtr-absences-year"
            className="form-select"
            style={{ maxWidth: "120px" }}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            disabled={loading}
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
          <Button variant="view" onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {!loading && !error && report && report.activeMonths.length > 0 && (
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              Table
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              Chart
            </button>
          </li>
        </ul>
      )}

      {loading && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && report && (
        <div className="card shadow-sm">
          <div className="card-body">
            {report.activeMonths.length === 0 || report.employees.length === 0 ? (
              <div className="alert alert-info mb-0" role="alert">
                No DTR entries were found for {year}.
              </div>
            ) : viewMode === "chart" ? (
              <AbsencesLineChart
                employees={report.employees}
                months={report.activeMonths}
                year={year}
                workingDays={report.workingDays}
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Employee</th>
                      {report.activeMonths.map((monthNumber) => (
                        <th
                          key={`header-${monthNumber}`}
                          scope="col"
                          className="text-end"
                        >
                          {MONTH_LABELS[monthNumber - 1]}
                          <span className="text-muted">
                            {": "}
                            {report.workingDays[monthNumber - 1]}
                          </span>
                        </th>
                      ))}
                      <th scope="col" className="text-end">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employees.map((employee) => (
                      <tr key={`${employee.empId}-${employee.empName}`}>
                        <td>{employee.empName}</td>
                        {employee.monthlyAbsences.map((value, index) => {
                          const style = {};
                          if (value >= 3) {
                            style.backgroundColor = "#f8d7da";
                          } else if (value >= 2) {
                            style.backgroundColor = "#fff3cd";
                          }

                          return (
                            <td
                              key={`${employee.empId}-${report.activeMonths[index]}`}
                              className="text-end"
                              style={style}
                            >
                              {formatNumber(value)}
                            </td>
                          );
                        })}
                        <td
                          className="text-end fw-semibold"
                          style={
                            employee.totalAbsence >= 3
                              ? { backgroundColor: "#f8d7da" }
                              : employee.totalAbsence >= 2
                              ? { backgroundColor: "#fff3cd" }
                              : {}
                          }
                        >
                          {formatNumber(employee.totalAbsence)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <th>Total</th>
                      {report.monthlyTotals.map((value, index) => (
                        <th key={`total-${index}`} className="text-end">
                          {formatNumber(value)}
                        </th>
                      ))}
                      <th className="text-end">
                        {formatNumber(report.grandTotal)}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DTRAbsences;
