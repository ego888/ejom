import express from "express";
import pool from "../utils/db.js";
import { loadSchedulingContext } from "../utils/dtrScheduleEngine.js";
import { addDays, buildAttendanceAnalytics, validDate } from "../utils/dtrAttendanceAnalytics.js";

const router = express.Router();

// Mounted behind the DTR authentication and feature-permission middleware.
router.get("/overview", async (req, res) => {
  const { dateFrom, dateTo, employeeId = "", groupId = "" } = req.query;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const clockParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const nowMinutes = Number(clockParts.find((part) => part.type === "hour").value) * 60 + Number(clockParts.find((part) => part.type === "minute").value);
  const days = (Date.parse(dateTo) - Date.parse(dateFrom)) / 86400000 + 1;
  if (!validDate(dateFrom) || !validDate(dateTo) || dateFrom < "1900-01-01" || days < 1 || days > 366 || dateTo >= today
    || typeof employeeId !== "string" || typeof groupId !== "string"
    || (employeeId && !/^(\d+|unmatched:.+)$/.test(employeeId)) || (groupId && !/^\d+$/.test(groupId))
    || [req.query.includeSundays, req.query.includeHolidays].some((value) => value !== undefined && !["true", "false"].includes(value))) {
    return res.status(400).json({ Status: false, Error: "Choose a valid date range of up to 366 completed days and valid filters." });
  }
  const previousFrom = addDays(dateFrom, -days);
  try {
    const [context, [employees], [entries], [coverage], [holidays], [groups]] = await Promise.all([
      loadSchedulingContext(pool, previousFrom, dateTo),
      pool.query(`SELECT id, dtrEmpId, fullName, name FROM employee
        WHERE active=1 OR dtrEmpId IN (SELECT empId FROM DTREntries WHERE date BETWEEN ? AND ? AND deleteRecord=0)
        ORDER BY fullName, name`, [previousFrom, dateTo]),
      pool.query(`SELECT id, batchId, empId, empName, DATE_FORMAT(date,'%Y-%m-%d') date,
        DATE_FORMAT(dateOut,'%Y-%m-%d') dateOut, timeIn, timeOut, processed,
        overtime, sundayOT, holidayOT, specialOT
        FROM DTREntries WHERE date BETWEEN ? AND ? AND deleteRecord=0 ORDER BY date, id`, [previousFrom, dateTo]),
      pool.query(`SELECT d.empId, d.batchId, DATE_FORMAT(b.periodStart,'%Y-%m-%d') periodStart,
        DATE_FORMAT(LEAST(b.periodEnd, latest.lastDate),'%Y-%m-%d') periodEnd,
        MAX(d.processed=1 AND d.deleteRecord=0) ready
        FROM DTREntries d JOIN DTRBatches b ON b.id=d.batchId
        JOIN (SELECT batchId, MAX(date) lastDate FROM DTREntries WHERE deleteRecord=0 GROUP BY batchId) latest ON latest.batchId=b.id
        WHERE b.periodStart<=? AND b.periodEnd>=?
        GROUP BY d.empId, d.batchId, b.periodStart, b.periodEnd, latest.lastDate`, [dateTo, previousFrom]),
      pool.query("SELECT DATE_FORMAT(holidayDate,'%Y-%m-%d') holidayDate FROM DTRHolidays WHERE holidayDate BETWEEN ? AND ?", [previousFrom, dateTo]),
      pool.query("SELECT id, name FROM DTRShiftGroups ORDER BY name"),
    ]);
    const knownIds = new Set(employees.filter((e) => e.dtrEmpId !== null).map((e) => String(e.dtrEmpId)));
    for (const entry of entries) {
      if (!knownIds.has(String(entry.empId))) {
        employees.push({ id: `unmatched:${entry.empId}`, dtrEmpId: entry.empId, fullName: entry.empName || `DTR ${entry.empId}` });
        knownIds.add(String(entry.empId));
      }
    }
    const result = buildAttendanceAnalytics({ employees, entries, coverage, holidays, context, dateFrom, dateTo, today, nowMinutes,
      employeeId, groupId, includeSundays: req.query.includeSundays === "true", includeHolidays: req.query.includeHolidays === "true" });
    res.json({ Status: true, Result: { ...result, filters: {
      employees: employees.map((e) => ({ id: e.id, name: e.fullName || e.name })), groups,
    } } });
  } catch (error) {
    console.error("Error generating attendance overview:", error);
    res.status(500).json({ Status: false, Error: "Unable to load the attendance overview. Please try again." });
  }
});

export default router;
