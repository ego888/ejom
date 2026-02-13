import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import "./Reports.css";

const SUNDAY_COLOR = "#fdecec";
const REGULAR_HOLIDAY_COLOR = "#f28b82";
const SPECIAL_HOLIDAY_COLOR = "#ffe2b3";
const NO_WORK_NO_PAY_COLOR = "#c8e6c9";
const BASELINE_HOURS = 8;
const MAX_BAR_HEIGHT = 60; // ~30% shorter than original
const BAR_PADDING_TOP = 8;
const BAR_PADDING_BOTTOM = 6;
const BAR_AREA_HEIGHT = MAX_BAR_HEIGHT + BAR_PADDING_TOP + BAR_PADDING_BOTTOM;
const BAR_COLOR_OK = "#0d6efd";
const BAR_COLOR_LOW = "#81b3fe";
const BAR_COLOR_ABSENT = "#dc3545";

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
    const holidayType = (day.holidayType || "").toLowerCase();
    if (holidayType === "special") {
      return SPECIAL_HOLIDAY_COLOR;
    }
    if (holidayType === "no work, no pay") {
      return NO_WORK_NO_PAY_COLOR;
    }
    return REGULAR_HOLIDAY_COLOR;
  }
  if (day.isSunday) return SUNDAY_COLOR;
  return "#f8f9fa";
};

const getBarColorForDay = (day) => {
  const hours = day.totalHours || 0;
  if (hours <= 0) return BAR_COLOR_ABSENT;

  const isSaturday =
    day.date && new Date(day.date).getDay
      ? new Date(day.date).getDay() === 6
      : false;

  if (isSaturday && hours >= 3) return BAR_COLOR_OK;
  if (hours < BASELINE_HOURS) return BAR_COLOR_LOW;
  return BAR_COLOR_OK;
};

const MonthBarChart = ({ monthNumber, days }) => {
  const maxHours = Math.max(...days.map((day) => day.totalHours || 0), 8) || 8;
  const baselinePosition =
    (BASELINE_HOURS / Math.max(maxHours, BASELINE_HOURS)) * MAX_BAR_HEIGHT;
  const absenceDays = days.filter(
    (day) => !day.isSunday && !day.isHoliday && (day.totalHours || 0) === 0
  ).length;
  const undertimeDays = days.filter((day) => {
    const hours = day.totalHours || 0;
    if (hours <= 0) return false; // absent not counted as undertime
    if (day.isSunday || day.isHoliday) return false;
    const isSaturday =
      day.date && new Date(day.date).getDay
        ? new Date(day.date).getDay() === 6
        : false;
    if (isSaturday) return hours < 3;
    return hours < BASELINE_HOURS;
  }).length;

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">{MONTH_LABELS[monthNumber - 1]}</h5>
        <div className="d-flex align-items-center gap-3 text-muted small">
          <span>Peak day: {maxHours.toFixed(2)} hrs</span>
          <span>
            Total absences: {absenceDays} day(s) | Undertime: {undertimeDays}{" "}
            day(s)
          </span>
        </div>
      </div>
      <div className="border rounded-3 p-3 bg-white shadow-sm">
        <div className="d-flex flex-column" style={{ gap: "4px" }}>
          <div
            className="position-relative w-100"
            style={{ height: `${BAR_AREA_HEIGHT}px` }}
          >
            <div
              className="position-absolute start-0 end-0"
              style={{
                bottom: `${BAR_PADDING_BOTTOM + baselinePosition}px`,
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
                height: "100%",
              }}
            >
              {days.map((day) => {
                const barHeight =
                  day.totalHours > 0
                    ? Math.max(
                        6,
                        Math.round((day.totalHours / maxHours) * MAX_BAR_HEIGHT)
                      )
                    : 0;
                const backgroundColor = getDayBackground(day);
                const isAbsentHighlight =
                  (!day.totalHours || day.totalHours <= 0) &&
                  !day.isHoliday &&
                  !day.isSunday;
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
                        height: `${BAR_AREA_HEIGHT}px`,
                        padding: `${BAR_PADDING_TOP}px 4px ${BAR_PADDING_BOTTOM}px`,
                        border: isAbsentHighlight
                          ? `1px dashed ${BAR_COLOR_ABSENT}`
                          : "1px solid transparent",
                      }}
                      title={`Day ${day.day}: ${day.totalHours.toFixed(
                        2
                      )} hrs${holidayLabel}${sundayLabel}`}
                    >
                      <div
                        style={{
                          width: "70%",
                          height: `${barHeight}px`,
                          backgroundColor: getBarColorForDay(day),
                          borderRadius: "4px",
                          transition: "height 0.2s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="d-flex"
            style={{ gap: "6px", overflowX: "auto", paddingTop: "2px" }}
          >
            {days.map((day) => (
              <div
                key={`label-${monthNumber}-${day.day}`}
                className="text-center"
                style={{ minWidth: "28px" }}
              >
                <small className="text-muted">{day.day}</small>
              </div>
            ))}
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
            style={{ width: "1.5in" }}
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
            style={{ width: "1.5in" }}
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
            style={{ width: "1.5in" }}
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
            style={{ width: "1.5in" }}
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

          <Button
            variant="view"
            onClick={fetchMonthlyReport}
            disabled={loading}
          >
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
        <div className="d-flex align-items-center gap-1">
          <span
            className="rounded-1 d-inline-block"
            style={{
              width: "16px",
              height: "10px",
              background: NO_WORK_NO_PAY_COLOR,
            }}
          ></span>
          <small className="text-muted">No Work, No Pay</small>
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
