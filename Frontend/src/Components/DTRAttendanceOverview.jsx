import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import AttendanceFilters from "./Logic/AttendanceFilters";
import ModalAlert from "./UI/ModalAlert";
import Button from "./UI/Button";
import "./DTRAttendanceOverview.css";

const number = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const duration = (value) => {
  const minutes = Math.round(value || 0);
  return `${Math.floor(minutes / 60).toLocaleString()}h ${minutes % 60}m`;
};
const rate = (value) => value === null ? "—" : `${number(value)}%`;
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const columns = [
  ["name", "Employee"], ["workedDays", "Worked days"], ["scheduledDays", "Evaluated workdays"],
  ["absentDays", "Absent days"], ["lateDays", "Late days"], ["lateMinutes", "Late time", duration],
  ["undertimeDays", "Early-out days"], ["undertimeMinutes", "Undertime", duration],
  ["lostMinutes", "Time lost", duration], ["attendanceRate", "Attendance", rate],
  ["overtimeMinutes", "Recorded OT", duration], ["leaveDays", "Leave days"], ["reviewDays", "Review days"],
  ["uncoveredDays", "Uncovered days"], ["unscheduledDays", "No schedule"],
];

const getYesterday = () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
};

const DTRAttendanceOverview = () => {
  const maxDate = getYesterday();
  const [filters, setFilters] = useState(() => ({ dateFrom: `${maxDate.slice(0, 7)}-01`, dateTo: maxDate,
    employeeId: "", groupId: "", includeSundays: false, includeHolidays: false }));
  const [options, setOptions] = useState({ employees: [], groups: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState({ key: "lostMinutes", direction: "desc" });
  const days = (Date.parse(filters.dateTo) - Date.parse(filters.dateFrom)) / 86400000 + 1;
  const valid = Boolean(filters.dateFrom && filters.dateTo && days >= 1 && days <= 366 && filters.dateTo <= maxDate);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setShowError(false);
    setLoading(valid);
    if (!valid) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${ServerIP}/auth/dtr/overview`, { params: filters, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response.data.Status) throw new Error(response.data.Error || "Unable to load attendance.");
        setData(response.data.Result);
        setOptions((previousOptions) => {
          const next = response.data.Result.filters;
          const selected = previousOptions.employees.find((employee) => String(employee.id) === filters.employeeId);
          // Keep a historical employee's name visible when the new period has no records.
          return selected && !next.employees.some((employee) => String(employee.id) === filters.employeeId)
            ? { ...next, employees: [...next.employees, selected] }
            : next;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.response?.data?.Error || err.message || "Unable to load attendance.");
        setShowError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, retry, valid]);

  const employees = useMemo(() => [...(data?.employees || [])].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    const result = typeof left === "string" ? left.localeCompare(right) : left - right;
    return (sort.direction === "asc" ? result : -result) || a.name.localeCompare(b.name);
  }), [data, sort]);
  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === "desc" ? "asc" : "desc" }));
  const updateFilters = (next) => { setData(null); setLoading(true); setFilters(next); };
  const total = data?.totals;
  const hasData = total && (total.workedDays + total.scheduledDays + total.reviewDays + total.leaveDays > 0);
  const cards = total ? [
    ["Days worked", number(total.workedDays), "Complete attendance records; one count per employee per day", "bi-calendar-check"],
    ["Absent days", number(total.absentDays), `${duration(total.absenceMinutes)} of scheduled work missed`, "bi-calendar-x"],
    ["Late time", duration(total.lateMinutes), `${number(total.lateDays)} late days · shift grace period applied`, "bi-clock"],
    ["Undertime", duration(total.undertimeMinutes), `${number(total.undertimeDays)} early departures`, "bi-clock-history"],
    ["Total time lost", duration(total.lostMinutes), `${number(total.lostDays)} equivalent shift days · absence + late + undertime`, "bi-hourglass-split"],
    ["Attendance rate", rate(total.attendanceRate), `${number(total.attendedDays)} attended / ${number(total.scheduledDays)} evaluated scheduled days`, "bi-percent"],
  ] : [];

  return <section className="dtr-attendance-overview mb-4" aria-labelledby="attendance-title">
    <h3 id="attendance-title">Attendance overview</h3>
    <p className="text-muted">Analyze completed workdays through yesterday, Philippine time. Team totals count employee-days.</p>
    <AttendanceFilters filters={filters} onChange={updateFilters} options={options} maxDate={maxDate} />
    {!valid && <p role="alert" className="text-danger">Choose a date range of 1–366 days ending no later than yesterday.</p>}
    {loading && valid && <p role="status">Loading attendance overview…</p>}
    {error && <div className="mb-3" role="alert"><p className="text-danger">{error}</p><Button variant="view" onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    {data && <>
      {!hasData && <p className="alert alert-info">No evaluated attendance is available for these filters. Import and process attendance, and assign employee schedules to calculate absences and attendance rates.</p>}
      <div className="row g-3 mb-3">
        {cards.map(([label, value, description, icon]) => <div className="col-sm-6 col-xl-4" key={label}>
          <div className="card h-100"><div className="card-body">
            <div className="d-flex justify-content-between"><span className="text-muted">{label}</span><i className={`bi ${icon} text-primary`} aria-hidden="true" /></div>
            <div className="fs-3 fw-semibold my-1">{value}</div><div className="small text-muted">{description}</div>
          </div></div>
        </div>)}
      </div>
      <div className="card mb-3"><div className="card-body">
        <div className="d-flex flex-wrap gap-4">
          <div><strong>{duration(total.overtimeMinutes)}</strong> recorded overtime</div>
          <div><strong>{number(total.leaveDays)}</strong> scheduled leave days</div>
          <div><strong>{number(total.reviewDays)}</strong> days needing review</div>
          <div><strong>{number(total.uncoveredDays)}</strong> scheduled days without import coverage</div>
          <div><strong>{number(total.unscheduledDays)}</strong> worked days without schedules</div>
        </div>
        {(total.reviewDays > 0 || total.uncoveredDays > 0 || total.unscheduledDays > 0) && <p className="small text-warning-emphasis mt-2 mb-0">Results are partial. Incomplete punches, overlapping imports, and uncovered days are excluded from absence and attendance-rate calculations. Worked days without schedules cannot be assessed for lateness or absence.</p>}
        {total.gapMinutes > 0 && <p className="small mt-2 mb-0">Additional gaps between punches: {duration(total.gapMinutes)}. These exclude meal breaks and are separate from absence, late time, and undertime.</p>}
      </div></div>

      <div className="card mb-3"><div className="card-body">
        <h4 className="h5">Employee comparison</h4>
        <p className="small text-muted">Select a column to sort. Evaluated workdays exclude records awaiting review and dates without import coverage.</p>
        <div className="table-responsive">
          <table className="table table-hover table-sm align-middle attendance-comparison">
            <thead><tr>{columns.map(([key, label]) => <th scope="col" key={key} aria-sort={sort.key === key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
              <button type="button" className="attendance-sort" onClick={() => changeSort(key)}>{label}{sort.key === key ? sort.direction === "asc" ? " ↑" : " ↓" : ""}</button>
            </th>)}</tr></thead>
            <tbody>{employees.map((employee) => <tr key={employee.id}>{columns.map(([key, , format]) => key === "name"
              ? <th scope="row" key={key}>{employee.name}<span className="d-block small text-muted fw-normal">DTR {employee.empId || "not linked"}</span></th>
              : <td key={key}>{format ? format(employee[key]) : number(employee[key])}</td>)}</tr>)}</tbody>
          </table>
          {!employees.length && <p className="text-muted">No employees match these filters.</p>}
        </div>
      </div></div>

      <div className="row g-3 mb-3">
        <div className="col-xl-6"><div className="card h-100"><div className="card-body">
          <h4 className="h5">Attendance trend</h4>
          <p className="small text-muted">Previous equal-length period: {data.previous.dateFrom} – {data.previous.dateTo}. Same Sunday, holiday, employee, and group filters.</p>
          {total.attendanceRate !== null && data.previous.attendanceRate !== null
            ? <p><strong>{number(total.attendanceRate - data.previous.attendanceRate)} percentage points</strong> change in attendance ({rate(data.previous.attendanceRate)} → {rate(total.attendanceRate)}).</p>
            : <p className="text-muted">Both periods need evaluated scheduled days to compare attendance.</p>}
          {(data.previous.reviewDays > 0 || data.previous.uncoveredDays > 0) && <p className="small text-warning-emphasis">The previous period also has incomplete coverage; compare these rates with care.</p>}
          <div className="table-responsive"><table className="table table-sm">
            <thead><tr><th scope="col">Month</th><th scope="col">Attendance</th><th scope="col">Absent days</th><th scope="col">Time lost</th></tr></thead>
            <tbody>{data.months.map((month) => <tr key={month.month}><th scope="row">{month.month}</th><td>{rate(month.attendanceRate)}</td><td>{number(month.absentDays)}</td><td>{duration(month.lostMinutes)}</td></tr>)}</tbody>
          </table></div>
          <p className="small text-muted mb-0">Monthly rows cover only the dates selected.</p>
        </div></div></div>
        <div className="col-xl-6"><div className="card h-100"><div className="card-body">
          <h4 className="h5">Day-of-week pattern</h4>
          <div className="table-responsive"><table className="table table-sm align-middle">
            <thead><tr><th scope="col">Day</th><th scope="col">Attendance</th><th scope="col">Absent days</th><th scope="col">Late days</th></tr></thead>
            <tbody>{data.weekdays.map((day) => <tr key={day.weekday}><th scope="row">{weekdayNames[day.weekday]}</th>
              <td><div className="d-flex align-items-center gap-2"><span>{rate(day.attendanceRate)}</span>{day.attendanceRate !== null && <progress className="attendance-rate-bar" max="100" value={day.attendanceRate} aria-label={`${weekdayNames[day.weekday]} attendance rate`} />}</div></td>
              <td>{number(day.absentDays)}</td><td>{number(day.lateDays)}</td></tr>)}</tbody>
          </table></div>
        </div></div></div>
      </div>
      <details className="small text-muted">
        <summary>How these figures are calculated</summary>
        <p className="mt-2">Absences require an assigned work shift and a processed import covering that employee and date. Coverage ends at the batch’s last recorded date. Overnight shifts are evaluated only after their scheduled end. Rest days, no-work days, and scheduled leave are not absences. Leave counts come from LEAVE schedule overrides.</p>
        <p>Days worked require complete processed punches. Attendance rate counts scheduled days with punches overlapping the shift, divided by evaluated scheduled days. Partial days count as attended; late time and undertime show the shortfall. Missing punches and overlapping batches must be reviewed before their time totals are included.</p>
        <p>Late time and undertime exclude the scheduled meal break. Arrival within the shift’s grace period is not late; after that, the full late duration applies. Equivalent days sum each day’s lost time divided by that day’s scheduled minutes. Overtime is the recorded calculated overtime and never offsets absences or late time. Recalculate batches after corrections to refresh recorded overtime.</p>
      </details>
    </>}
    <ModalAlert show={showError} onClose={() => setShowError(false)} type="alert" title="Error" message={error} />
  </section>;
};

export default DTRAttendanceOverview;
