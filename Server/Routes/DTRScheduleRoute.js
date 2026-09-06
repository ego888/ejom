import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();
const canManage = [verifyUser];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

router.get("/employees", verifyUser, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, dtrEmpId, name, fullName FROM employee
       WHERE active = 1 ORDER BY fullName, name`
    );
    res.json({ Status: true, Employees: rows });
  } catch (error) {
    res.status(500).json({ Status: false, Error: error.message });
  }
});

router.get("/groups", verifyUser, async (_req, res) => {
  try {
    const [groups] = await pool.query(
      `SELECT g.*, COUNT(m.id) memberCount FROM DTRShiftGroups g
       LEFT JOIN DTRShiftGroupMembers m ON m.groupId = g.id
         AND CURDATE() BETWEEN m.effectiveFrom AND COALESCE(m.effectiveUntil, '9999-12-31')
       GROUP BY g.id ORDER BY g.active DESC, g.name`
    );
    res.json({ Status: true, Groups: groups });
  } catch (error) {
    res.status(500).json({ Status: false, Error: error.message });
  }
});

router.post("/groups", ...canManage, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const color = /^#[0-9a-f]{6}$/i.test(req.body.color) ? req.body.color : "#6c757d";
  if (!name) return res.status(400).json({ Status: false, Error: "Group name is required" });
  try {
    const [result] = await pool.query(
      "INSERT INTO DTRShiftGroups (name, color, active) VALUES (?, ?, 1)",
      [name, color]
    );
    res.status(201).json({ Status: true, Id: result.insertId });
  } catch (error) {
    res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      Status: false,
      Error: error.code === "ER_DUP_ENTRY" ? "Group name already exists" : error.message,
    });
  }
});

router.put("/groups/:id", ...canManage, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const color = /^#[0-9a-f]{6}$/i.test(req.body.color) ? req.body.color : "#6c757d";
  if (!name) return res.status(400).json({ Status: false, Error: "Group name is required" });
  try {
    const [result] = await pool.query("UPDATE DTRShiftGroups SET name=?, color=?, active=? WHERE id=?", [
      name, color, req.body.active ? 1 : 0, req.params.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ Status: false, Error: "Shift group not found" });
    }
    res.json({ Status: true });
  } catch (error) {
    res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      Status: false,
      Error: error.code === "ER_DUP_ENTRY" ? "Group name already exists" : error.message,
    });
  }
});

router.get("/groups/:id/members", verifyUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.groupId, m.employeeId,
              DATE_FORMAT(m.effectiveFrom, '%Y-%m-%d') effectiveFrom,
              DATE_FORMAT(m.effectiveUntil, '%Y-%m-%d') effectiveUntil,
              e.fullName, e.name, e.dtrEmpId,
              CASE
                WHEN CURDATE() < m.effectiveFrom THEN 'Upcoming'
                WHEN m.effectiveUntil IS NOT NULL AND CURDATE() > m.effectiveUntil THEN 'Ended'
                ELSE 'Active'
              END membershipStatus
       FROM DTRShiftGroupMembers m JOIN employee e ON e.id=m.employeeId
       WHERE m.groupId=? ORDER BY m.effectiveFrom DESC, e.fullName`, [req.params.id]
    );
    res.json({ Status: true, Members: rows });
  } catch (error) {
    res.status(500).json({ Status: false, Error: error.message });
  }
});

router.post("/groups/:id/members", ...canManage, async (req, res) => {
  const { employeeIds, effectiveFrom, effectiveUntil } = req.body;
  if (
    !Array.isArray(employeeIds) ||
    !employeeIds.length ||
    !isoDate.test(effectiveFrom || "") ||
    (effectiveUntil && !isoDate.test(effectiveUntil)) ||
    (effectiveUntil && effectiveUntil < effectiveFrom)
  ) {
    return res.status(400).json({ Status: false, Error: "Employees and effective start are required" });
  }
  const uniqueEmployeeIds = [...new Set(employeeIds.map(Number).filter(Number.isInteger))];
  if (!uniqueEmployeeIds.length) {
    return res.status(400).json({ Status: false, Error: "Select at least one employee" });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const placeholders = uniqueEmployeeIds.map(() => "?").join(",");
    const [conflicts] = await connection.query(
      `SELECT m.employeeId, e.fullName, e.name, g.name groupName,
              DATE_FORMAT(m.effectiveFrom, '%Y-%m-%d') effectiveFrom,
              DATE_FORMAT(m.effectiveUntil, '%Y-%m-%d') effectiveUntil
       FROM DTRShiftGroupMembers m
       JOIN employee e ON e.id = m.employeeId
       JOIN DTRShiftGroups g ON g.id = m.groupId
       WHERE m.employeeId IN (${placeholders})
         AND m.effectiveFrom <= COALESCE(?, '9999-12-31')
         AND COALESCE(m.effectiveUntil, '9999-12-31') >= ?
       FOR UPDATE`,
      [...uniqueEmployeeIds, effectiveUntil || null, effectiveFrom]
    );

    if (conflicts.length) {
      await connection.rollback();
      const details = conflicts.map((conflict) => {
        const employeeName = conflict.fullName || conflict.name;
        const range = `${conflict.effectiveFrom} to ${conflict.effectiveUntil || "ongoing"}`;
        return `${employeeName} is already in ${conflict.groupName} (${range})`;
      });
      return res.status(409).json({
        Status: false,
        Error: `Overlapping group membership: ${details.join("; ")}`,
        Conflicts: conflicts,
      });
    }

    for (const employeeId of uniqueEmployeeIds) {
      await connection.query(
        `INSERT INTO DTRShiftGroupMembers
         (groupId, employeeId, effectiveFrom, effectiveUntil) VALUES (?, ?, ?, ?)`,
        [req.params.id, employeeId, effectiveFrom, effectiveUntil || null]
      );
    }
    await connection.commit();
    res.status(201).json({ Status: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ Status: false, Error: error.message });
  } finally { connection.release(); }
});

router.delete("/members/:id", ...canManage, async (req, res) => {
  try {
    await pool.query("DELETE FROM DTRShiftGroupMembers WHERE id=?", [req.params.id]);
    res.json({ Status: true });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.get("/assignments", verifyUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.groupId, a.employeeId, a.shiftId,
              DATE_FORMAT(a.dateFrom, '%Y-%m-%d') dateFrom,
              DATE_FORMAT(a.dateTo, '%Y-%m-%d') dateTo,
              a.weekdaysMask, s.name shiftName,
              g.name groupName, e.fullName employeeName
       FROM DTRShiftAssignments a
       JOIN DTRShiftTemplates s ON s.id=a.shiftId
       LEFT JOIN DTRShiftGroups g ON g.id=a.groupId
       LEFT JOIN employee e ON e.id=a.employeeId
       ORDER BY COALESCE(g.name, e.fullName, e.name),
                a.dateFrom DESC,
                s.name,
                a.id`
    );
    res.json({ Status: true, Assignments: rows });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.get("/assignment-preview", verifyUser, async (req, res) => {
  const { targetType, targetId, dateFrom, dateTo } = req.query;
  if (!["group", "employee"].includes(targetType) || !targetId ||
      !isoDate.test(dateFrom || "") || !isoDate.test(dateTo || "") || dateTo < dateFrom) {
    return res.status(400).json({ Status: false, Error: "Select a target and valid date range" });
  }
  try {
    let rows;
    if (targetType === "employee") {
      [rows] = await pool.query(
        `SELECT id, dtrEmpId, fullName, name FROM employee
         WHERE id=? AND active=1`, [targetId]
      );
    } else {
      [rows] = await pool.query(
        `SELECT DISTINCT e.id, e.dtrEmpId, e.fullName, e.name,
                DATE_FORMAT(m.effectiveFrom, '%Y-%m-%d') membershipFrom,
                DATE_FORMAT(m.effectiveUntil, '%Y-%m-%d') membershipUntil
         FROM DTRShiftGroupMembers m
         JOIN employee e ON e.id=m.employeeId AND e.active=1
         WHERE m.groupId=?
           AND m.effectiveFrom<=?
           AND COALESCE(m.effectiveUntil,'9999-12-31')>=?
         ORDER BY e.fullName, e.name`, [targetId, dateTo, dateFrom]
      );
    }
    res.json({ Status: true, Employees: rows });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.post("/assignments", ...canManage, async (req, res) => {
  const { targetType, targetId, shiftId, dateFrom, dateTo, weekdaysMask = 127 } = req.body;
  if (!["group", "employee"].includes(targetType) || !targetId || !shiftId ||
      !isoDate.test(dateFrom || "") || !isoDate.test(dateTo || "") || dateTo < dateFrom) {
    return res.status(400).json({ Status: false, Error: "Complete assignment details are required" });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO DTRShiftAssignments
       (groupId, employeeId, shiftId, dateFrom, dateTo, weekdaysMask, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [targetType === "group" ? targetId : null, targetType === "employee" ? targetId : null,
       shiftId, dateFrom, dateTo, Number(weekdaysMask), req.user.id]
    );
    res.status(201).json({ Status: true, Id: result.insertId });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.put("/assignments/:id", ...canManage, async (req, res) => {
  const { targetType, targetId, shiftId, dateFrom, dateTo, weekdaysMask = 127 } = req.body;
  if (!["group", "employee"].includes(targetType) || !targetId || !shiftId ||
      !isoDate.test(dateFrom || "") || !isoDate.test(dateTo || "") || dateTo < dateFrom) {
    return res.status(400).json({ Status: false, Error: "Complete assignment details are required" });
  }
  try {
    const [result] = await pool.query(
      `UPDATE DTRShiftAssignments
       SET groupId=?, employeeId=?, shiftId=?, dateFrom=?, dateTo=?, weekdaysMask=?
       WHERE id=?`,
      [targetType === "group" ? targetId : null,
       targetType === "employee" ? targetId : null,
       shiftId, dateFrom, dateTo, Number(weekdaysMask), req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ Status: false, Error: "Assignment not found" });
    res.json({ Status: true });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.delete("/assignments/:id", ...canManage, async (req, res) => {
  try {
    await pool.query("DELETE FROM DTRShiftAssignments WHERE id=?", [req.params.id]);
    res.json({ Status: true });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.get("/overrides", verifyUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.employeeId,
              DATE_FORMAT(o.workDate, '%Y-%m-%d') workDate,
              o.shiftId, o.scheduleType, o.notes,
              e.fullName employeeName, e.name employeeShortName,
              s.name shiftName
       FROM DTRScheduleOverrides o
       JOIN employee e ON e.id=o.employeeId
       LEFT JOIN DTRShiftTemplates s ON s.id=o.shiftId
       ORDER BY o.workDate DESC, e.fullName, e.name, o.id DESC`
    );
    res.json({ Status: true, Overrides: rows });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.post("/overrides", ...canManage, async (req, res) => {
  const { employeeId, workDate, shiftId, scheduleType = "WORK", notes } = req.body;
  if (!employeeId || !isoDate.test(workDate || "") ||
      !["WORK", "REST", "LEAVE", "NO_WORK"].includes(scheduleType) ||
      (scheduleType === "WORK" && !shiftId)) {
    return res.status(400).json({ Status: false, Error: "Complete override details are required" });
  }
  try {
    await pool.query(
      `INSERT INTO DTRScheduleOverrides
       (employeeId, workDate, shiftId, scheduleType, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE shiftId=VALUES(shiftId), scheduleType=VALUES(scheduleType),
         notes=VALUES(notes), createdBy=VALUES(createdBy)`,
      [employeeId, workDate, scheduleType === "WORK" ? shiftId : null,
       scheduleType, notes || null, req.user.id]
    );
    res.json({ Status: true });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.delete("/overrides/:id", ...canManage, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM DTRScheduleOverrides WHERE id=?", [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ Status: false, Error: "Override not found" });
    }
    res.json({ Status: true });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

router.get("/calendar", verifyUser, async (req, res) => {
  const month = String(req.query.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ Status: false, Error: "Valid month is required" });
  const start = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const end = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
  try {
    const [[employees], [shifts], [members], [assignments], [overrides]] = await Promise.all([
      pool.query("SELECT id, dtrEmpId, fullName, name FROM employee WHERE active=1 ORDER BY fullName, name"),
      pool.query("SELECT id, name, color FROM DTRShiftTemplates"),
      pool.query(`SELECT *, DATE_FORMAT(effectiveFrom,'%Y-%m-%d') effectiveFrom,
        DATE_FORMAT(effectiveUntil,'%Y-%m-%d') effectiveUntil
        FROM DTRShiftGroupMembers WHERE effectiveFrom<=? AND COALESCE(effectiveUntil,'9999-12-31')>=?`, [end, start]),
      pool.query(`SELECT *, DATE_FORMAT(dateFrom,'%Y-%m-%d') dateFrom,
        DATE_FORMAT(dateTo,'%Y-%m-%d') dateTo
        FROM DTRShiftAssignments WHERE dateFrom<=? AND dateTo>=? ORDER BY id`, [end, start]),
      pool.query(`SELECT *, DATE_FORMAT(workDate,'%Y-%m-%d') workDate
        FROM DTRScheduleOverrides WHERE workDate BETWEEN ? AND ?`, [start, end]),
    ]);
    const shiftMap = new Map(shifts.map((s) => [Number(s.id), s]));
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const schedules = employees.map((employee) => {
      const days = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const weekday = new Date(`${date}T00:00:00`).getDay();
        const override = overrides.find((o) => Number(o.employeeId) === Number(employee.id) && String(o.workDate).slice(0, 10) === date);
        let resolved = override ? { type: override.scheduleType, shiftId: override.shiftId, source: "override" } : null;
        if (!resolved) {
          const individual = assignments.filter((a) => Number(a.employeeId) === Number(employee.id) && date >= String(a.dateFrom).slice(0,10) && date <= String(a.dateTo).slice(0,10) && (a.weekdaysMask & (1 << weekday))).at(-1);
          if (individual) resolved = { type: "WORK", shiftId: individual.shiftId, source: "employee" };
        }
        if (!resolved) {
          const groupIds = members.filter((m) => Number(m.employeeId) === Number(employee.id) && date >= String(m.effectiveFrom).slice(0,10) && (!m.effectiveUntil || date <= String(m.effectiveUntil).slice(0,10))).map((m) => Number(m.groupId));
          const groupAssignment = assignments.filter((a) => groupIds.includes(Number(a.groupId)) && date >= String(a.dateFrom).slice(0,10) && date <= String(a.dateTo).slice(0,10) && (a.weekdaysMask & (1 << weekday))).at(-1);
          if (groupAssignment) resolved = { type: "WORK", shiftId: groupAssignment.shiftId, source: "group" };
        }
        const shift = resolved?.shiftId ? shiftMap.get(Number(resolved.shiftId)) : null;
        days.push({ date, type: resolved?.type || null, source: resolved?.source || null, shift });
      }
      return { ...employee, days };
    });
    res.json({ Status: true, Month: month, Schedules: schedules });
  } catch (error) { res.status(500).json({ Status: false, Error: error.message }); }
});

export const DTRScheduleRouter = router;
