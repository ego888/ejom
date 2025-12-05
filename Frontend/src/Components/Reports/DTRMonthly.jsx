import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import "./Reports.css";

const SUNDAY_COLOR = "#fdecec";
const REGULAR_HOLIDAY_COLOR = "#f28b82";
const SPECIAL_HOLIDAY_COLOR = "#ffe2b3";
const BASELINE_HOURS = 8;

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const clampMonthRange = (from, to) => {
  const safeFrom = Math.min(Math.max(from, 1), 12);
  const safeTo = Math.min(Math.max(to, safeFrom), 12);
  return [safeFrom, safeTo];
};

const getDayBackground = (day) => {
  if (day.isHoliday) {
    if ((day.holidayType || "").toLowerCase() === "special") {
      return SPECIAL_HOLIDAY_COLOR;
    }
    return REGULAR_HOLIDAY_COLOR;
  }
  if (day.isSunday) return SUNDAY_COLOR;
  return "#f8f9fa";
};

const MonthBarChart = ({ monthNumber, days }) => {
  const maxBarHeight = 170;
  const maxHours =
    Math.max(...days.map((day) => day.totalHours || 0), 8) || 8;
  const baselinePosition = Math.min(
    maxBarHeight,
    (BASELINE_HOURS / maxHours) * maxBarHeight
  );

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">{MONTH_LABELS[monthNumber - 1]}</h5>
        <span className="text-muted small">
          Peak day: {maxHours.toFixed(2)} hrs
        </span>
      </div>
      <div className="border rounded-3 p-3 bg-white shadow-sm">
        <div className="d-flex align-items-end" style={{ gap: "8px" }}>
          <div
            className="position-relative w-100"
            style={{ minHeight: `${maxBarHeight + 22}px` }}
          >
            <div
              className="position-absolute start-0 end-0"
              style={{
                bottom: `${baselinePosition + 6}px`,
                borderTop: "1px dashed #6c757d",
                pointerEvents: "none",
              }}
              title={`${BASELINE_HOURS} hours`}
            />
            <div
              className="d-flex align-items-end w-100"
              style={{
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "6px",
              }}
            >
              {days.map((day) => {
                const barHeight =
                  day.totalHours > 0
                    ? Math.max(
                        6,
                        Math.round((day.totalHours / maxHours) * maxBarHeight)
                      )
                    : 0;
                const backgroundColor = getDayBackground(day);
                const holidayLabel = day.isHoliday
                  ? day.holidayType
                    ? ` (${day.holidayType} Holiday)`
                    : " (Holiday)"
                  : "";
                const sundayLabel =
                  day.isSunday && !day.isHoliday ? " (Sunday)" : "";

                return (
                  <div
                    key={`${monthNumber}-${day.day}`}
                    className="text-center"
                    style={{ minWidth: "28px" }}
                  >
                    <div
                      className="rounded-2 d-flex align-items-end justify-content-center"
                      style={{
                        backgroundColor,
                        height: `${maxBarHeight + 16}px`,
                        padding: "8px 4px 6px",
                      }}
                      title={`Day ${day.day}: ${day.totalHours.toFixed(
                        2
                      )} hrs${holidayLabel}${sundayLabel}`}
                    >
                      <div
                        style={{
                          width: "70%",
                          height: `${barHeight}px`,
                          backgroundColor: "#0d6efd",
                          borderRadius: "4px",
                          transition: "height 0.2s ease",
                        }}
                      />
                    </div>
                    <small className="text-muted">{day.day}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DTRMonthly = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [monthFrom, setMonthFrom] = useState(currentMonth);
  const [monthTo, setMonthTo] = useState(currentMonth);
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const skipNextFetchRef = useRef(false);

  const yearOptions = useMemo(() => {
    const span = 6;
    return Array.from({ length: span }, (_, index) => currentYear - index);
  }, [currentYear]);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/dtr/monthly`, {
        params: {
          year,
          monthFrom,
          monthTo,
          employeeId: employeeId || undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data?.Status) {
        const result = response.data.Result;
        const nextEmployees = result.employees || [];
        setEmployees(nextEmployees);

        const resolvedEmployeeId =
          result.employeeId ||
          employeeId ||
          (nextEmployees.length > 0 ? nextEmployees[0].empId : "");

        if (resolvedEmployeeId && resolvedEmployeeId !== employeeId) {
          skipNextFetchRef.current = true;
          setEmployeeId(resolvedEmployeeId);
        }

        setReport({
          ...result,
          employeeId: resolvedEmployeeId,
        });
      } else {
        setReport(null);
        setError(
          response.data?.Error ||
            "Failed to load DTR monthly hours. Please try again."
        );
      }
    } catch (err) {
      console.error("Error fetching DTR monthly report:", err);
      setReport(null);
      setError("Unable to load DTR monthly hours. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const [safeFrom, safeTo] = clampMonthRange(monthFrom, monthTo);
    if (safeFrom !== monthFrom) {
      setMonthFrom(safeFrom);
    }
    if (safeTo !== monthTo) {
      setMonthTo(safeTo);
    }
  }, [monthFrom, monthTo]);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    fetchMonthlyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, monthFrom, monthTo, employeeId]);

  const totalHours = useMemo(() => {
    if (!report?.months) return 0;
    return report.months.reduce(
      (sum, month) =>
        sum +
        month.days.reduce(
          (monthSum, day) => monthSum + (day.totalHours || 0),
          0
        ),
      0
    );
  }, [report]);

  return (
    <div className="reports-content">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h3 className="mb-2 mb-md-0">DTR Monthly Hours</h3>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <label htmlFor="dtr-monthly-employee" className="form-label mb-0">
            Employee:
          </label>
          <select
            id="dtr-monthly-employee"
            className="form-select"
            style={{ minWidth: "220px" }}
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            disabled={loading || employees.length === 0}
          >
            {employees.map((employee) => (
              <option key={employee.empId} value={employee.empId}>
                {employee.empName}
              </option>
            ))}
          </select>

          <label htmlFor="dtr-monthly-from" className="form-label mb-0">
            Month From:
          </label>
          <select
            id="dtr-monthly-from"
            className="form-select"
            style={{ minWidth: "140px" }}
            value={monthFrom}
            onChange={(event) =>
              setMonthFrom(Number.parseInt(event.target.value, 10))
            }
            disabled={loading}
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>

          <label htmlFor="dtr-monthly-to" className="form-label mb-0">
            Month To:
          </label>
          <select
            id="dtr-monthly-to"
            className="form-select"
            style={{ minWidth: "140px" }}
            value={monthTo}
            onChange={(event) =>
              setMonthTo(Number.parseInt(event.target.value, 10))
            }
            disabled={loading}
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>

          <label htmlFor="dtr-monthly-year" className="form-label mb-0">
            Year:
          </label>
          <select
            id="dtr-monthly-year"
            className="form-select"
            style={{ maxWidth: "120px" }}
            value={year}
            onChange={(event) =>
              setYear(Number.parseInt(event.target.value, 10))
            }
            disabled={loading}
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>

          <Button variant="view" onClick={fetchMonthlyReport} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="mb-3 d-flex flex-wrap align-items-center gap-3">
        <div className="d-flex align-items-center gap-1">
          <span
            className="rounded-1 d-inline-block"
            style={{ width: "16px", height: "10px", background: SUNDAY_COLOR }}
          ></span>
          <small className="text-muted">Sunday</small>
        </div>
        <div className="d-flex align-items-center gap-1">
          <span
            className="rounded-1 d-inline-block"
            style={{
              width: "16px",
              height: "10px",
              background: REGULAR_HOLIDAY_COLOR,
            }}
          ></span>
          <small className="text-muted">Regular Holiday</small>
        </div>
        <div className="d-flex align-items-center gap-1">
          <span
            className="rounded-1 d-inline-block"
            style={{
              width: "16px",
              height: "10px",
              background: SPECIAL_HOLIDAY_COLOR,
            }}
          ></span>
          <small className="text-muted">Special Holiday</small>
        </div>
        <div className="ms-auto text-muted small">
          Total hours in range: {totalHours.toFixed(2)}
        </div>
      </div>

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

      {!loading && !error && report && report.months && (
        <div className="card shadow-sm">
          <div className="card-body">
            {report.months.length === 0 ? (
              <div className="alert alert-info mb-0" role="alert">
                No DTR entries were found for the selected filters.
              </div>
            ) : (
              report.months.map((monthData) => (
                <MonthBarChart
                  key={`month-${monthData.month}`}
                  monthNumber={monthData.month}
                  days={monthData.days}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DTRMonthly;
