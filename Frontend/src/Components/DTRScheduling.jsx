import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import "./DTRScheduling.css";

const todayMonth = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DTRScheduling = ({ initialSection = "calendar", showNavigation = true }) => {
  const [section, setSection] = useState(initialSection);
  const [employees, setEmployees] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [rosterGroupId, setRosterGroupId] = useState("");
  const [shifts, setShifts] = useState([]);
  const [month, setMonth] = useState(todayMonth);
  const [calendar, setCalendar] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [overrideRecords, setOverrideRecords] = useState([]);
  const [assignmentPreview, setAssignmentPreview] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [message, setMessage] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: "", color: "#6c757d" });
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [memberForm, setMemberForm] = useState({ groupId: "", employeeIds: [], effectiveFrom: today, effectiveUntil: "" });
  const [assignment, setAssignment] = useState({ targetType: "group", targetId: "", shiftId: "", dateFrom: today, dateTo: today, weekdaysMask: 127 });
  const [override, setOverride] = useState({ employeeId: "", workDate: today, scheduleType: "WORK", shiftId: "", notes: "" });

  const showError = (error) => setMessage({ type: "danger", text: error.response?.data?.Error || error.message });
  const loadOptions = async () => {
    try {
      const [employeeRes, groupRes, shiftRes] = await Promise.all([
        axios.get(`${ServerIP}/auth/dtr/schedules/employees`),
        axios.get(`${ServerIP}/auth/dtr/schedules/groups`),
        axios.get(`${ServerIP}/auth/dtr/shifts`),
      ]);
      setEmployees(employeeRes.data.Employees || []);
      setGroups(groupRes.data.Groups || []);
      setShifts((shiftRes.data.Shifts || []).filter((shift) => shift.active));
    } catch (error) { showError(error); }
  };
  const loadCalendar = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/schedules/calendar`, { params: { month } });
      setCalendar(response.data.Schedules || []);
    } catch (error) { showError(error); }
  };
  const loadAssignments = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/schedules/assignments`);
      setAssignments(response.data.Assignments || []);
    } catch (error) { showError(error); }
  };
  const loadOverrides = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/schedules/overrides`);
      setOverrideRecords(response.data.Overrides || []);
    } catch (error) { showError(error); }
  };
  const loadGroupMembers = async (groupId) => {
    if (!groupId) {
      setGroupMembers([]);
      return;
    }
    try {
      const response = await axios.get(
        `${ServerIP}/auth/dtr/schedules/groups/${groupId}/members`
      );
      setGroupMembers(response.data.Members || []);
    } catch (error) { showError(error); }
  };
  useEffect(() => { loadOptions(); loadAssignments(); loadOverrides(); }, []);
  useEffect(() => { loadCalendar(); }, [month]);
  useEffect(() => { setSection(initialSection); }, [initialSection]);

  const days = useMemo(() => calendar[0]?.days || [], [calendar]);
  const saveGroup = async (event) => {
    event.preventDefault();
    try {
      if (editingGroupId) {
        const existingGroup = groups.find(
          (group) => Number(group.id) === Number(editingGroupId)
        );
        await axios.put(
          `${ServerIP}/auth/dtr/schedules/groups/${editingGroupId}`,
          { ...groupForm, active: Boolean(existingGroup?.active) }
        );
      } else {
        await axios.post(`${ServerIP}/auth/dtr/schedules/groups`, groupForm);
      }
      setGroupForm({ name: "", color: "#6c757d" });
      setEditingGroupId(null);
      setMessage({
        type: "success",
        text: editingGroupId ? "Shift group renamed." : "Shift group created.",
      });
      await loadOptions();
    } catch (error) { showError(error); }
  };
  const editGroup = (group) => {
    setEditingGroupId(group.id);
    setGroupForm({ name: group.name, color: group.color });
    setMessage(null);
  };
  const cancelGroupEdit = () => {
    setEditingGroupId(null);
    setGroupForm({ name: "", color: "#6c757d" });
  };
  const saveMembers = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${ServerIP}/auth/dtr/schedules/groups/${memberForm.groupId}/members`, memberForm);
      setMemberForm({ ...memberForm, employeeIds: [] });
      setMessage({ type: "success", text: "Group membership added." });
      await loadOptions();
      setRosterGroupId(String(memberForm.groupId));
      await loadGroupMembers(memberForm.groupId);
    } catch (error) { showError(error); }
  };
  const viewMembers = async (groupId) => {
    setRosterGroupId(String(groupId));
    await loadGroupMembers(groupId);
  };
  const removeMember = async (membership) => {
    const employeeName = membership.fullName || membership.name;
    if (!window.confirm(`Remove ${employeeName}'s membership record?`)) return;
    try {
      await axios.delete(`${ServerIP}/auth/dtr/schedules/members/${membership.id}`);
      setMessage({ type: "success", text: "Group membership removed." });
      await Promise.all([loadGroupMembers(rosterGroupId), loadOptions(), loadCalendar()]);
    } catch (error) { showError(error); }
  };
  const saveAssignment = async (event) => {
    event.preventDefault();
    try {
      const url = `${ServerIP}/auth/dtr/schedules/assignments${editingAssignmentId ? `/${editingAssignmentId}` : ""}`;
      if (editingAssignmentId) await axios.put(url, assignment);
      else await axios.post(url, assignment);
      setMessage({ type: "success", text: editingAssignmentId ? "Assignment updated." : "Shift assigned for the selected date range." });
      setEditingAssignmentId(null);
      setAssignmentPreview([]);
      await Promise.all([loadCalendar(), loadAssignments()]);
    } catch (error) { showError(error); }
  };
  const saveOverride = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${ServerIP}/auth/dtr/schedules/overrides`, override);
      setMessage({ type: "success", text: "Employee date override saved." });
      await Promise.all([loadCalendar(), loadOverrides()]);
    } catch (error) { showError(error); }
  };
  const toggleWeekday = (day) => setAssignment((current) => ({
    ...current, weekdaysMask: current.weekdaysMask ^ (1 << day),
  }));
  const setAssignmentRange = (part) => {
    const base = assignment.dateFrom || `${month}-01`;
    const selectedMonth = base.slice(0, 7);
    const [year, monthNumber] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const ranges = {
      whole: [`${selectedMonth}-01`, `${selectedMonth}-${String(lastDay).padStart(2, "0")}`],
      first: [`${selectedMonth}-01`, `${selectedMonth}-15`],
      second: [`${selectedMonth}-16`, `${selectedMonth}-${String(lastDay).padStart(2, "0")}`],
    };
    const [dateFrom, dateTo] = ranges[part];
    setAssignment({ ...assignment, dateFrom, dateTo });
    setAssignmentPreview([]);
  };
  const previewAssignment = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/schedules/assignment-preview`, {
        params: assignment,
      });
      setAssignmentPreview(response.data.Employees || []);
    } catch (error) { showError(error); }
  };
  const editAssignment = (item) => {
    setEditingAssignmentId(item.id);
    setAssignment({
      targetType: item.groupId ? "group" : "employee",
      targetId: String(item.groupId || item.employeeId),
      shiftId: String(item.shiftId),
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
      weekdaysMask: Number(item.weekdaysMask),
    });
    setAssignmentPreview([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteAssignment = async (item) => {
    if (!window.confirm(`Delete ${item.shiftName} assignment for ${item.groupName || item.employeeName}?`)) return;
    try {
      await axios.delete(`${ServerIP}/auth/dtr/schedules/assignments/${item.id}`);
      if (editingAssignmentId === item.id) setEditingAssignmentId(null);
      await Promise.all([loadAssignments(), loadCalendar()]);
      setMessage({ type: "success", text: "Assignment deleted." });
    } catch (error) { showError(error); }
  };
  const openOverrideFromCalendar = (employee, day) => {
    const scheduleType = day.type || "WORK";
    setOverride({
      employeeId: String(employee.id),
      workDate: day.date,
      scheduleType,
      shiftId: scheduleType === "WORK" && day.shift?.id
        ? String(day.shift.id)
        : "",
      notes: "",
    });
    setMessage(null);
    setSection("override");
  };
  const editOverride = (record) => {
    setOverride({
      employeeId: String(record.employeeId),
      workDate: record.workDate,
      scheduleType: record.scheduleType,
      shiftId: record.shiftId ? String(record.shiftId) : "",
      notes: record.notes || "",
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteOverride = async (record) => {
    const employeeName = record.employeeName || record.employeeShortName;
    if (!window.confirm(`Delete ${employeeName}'s override for ${record.workDate}?`)) return;
    try {
      await axios.delete(`${ServerIP}/auth/dtr/schedules/overrides/${record.id}`);
      setMessage({ type: "success", text: "Override deleted." });
      await Promise.all([loadCalendar(), loadOverrides()]);
    } catch (error) { showError(error); }
  };

  return <div className="dtr-scheduling">
    {showNavigation && <div className="d-flex gap-2 mb-3">
      {["calendar", "assign", "groups", "override"].map((item) =>
        <button key={item} className={`btn btn-sm ${section === item ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setSection(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>}
    {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

    {section === "calendar" && <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <label htmlFor="schedule-month">Month</label>
        <input id="schedule-month" type="month" className="form-control schedule-month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <div className="schedule-board"><table className="table table-bordered table-sm">
        <thead><tr><th className="employee-column">Employee</th>{days.map((day) => <th key={day.date}>{day.date.slice(8)}<small>{weekdayLabels[new Date(`${day.date}T00:00:00`).getDay()]}</small></th>)}</tr></thead>
        <tbody>{calendar.map((employee) => <tr key={employee.id}>
          <th className="employee-column">{employee.fullName || employee.name}</th>
          {employee.days.map((day) => <td key={day.date} title={`${day.date} — ${day.source || "Unassigned"}. Click to override.`}
            style={day.shift ? { backgroundColor: `${day.shift.color}33` } : undefined}
            className={`schedule-cell ${day.type && day.type !== "WORK" ? "non-work-day" : ""}`}
            role="button" tabIndex={0}
            onClick={() => openOverrideFromCalendar(employee, day)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openOverrideFromCalendar(employee, day); }}>
            {day.type === "WORK" ? day.shift?.name : day.type || "—"}
          </td>)}
        </tr>)}</tbody>
      </table></div>
    </>}

    {section === "groups" && <div className="row g-4">
      <div className="col-lg-4"><div className="card"><div className="card-body">
        <h5>{editingGroupId ? "Rename shift group" : "Create shift group"}</h5><form onSubmit={saveGroup} className="d-flex gap-2">
          <input className="form-control" required placeholder="Group name" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
          <input type="color" className="form-control form-control-color" value={groupForm.color} onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })} />
          <Button variant="save" type="submit">{editingGroupId ? "Save" : "Add"}</Button>
          {editingGroupId && <Button variant="cancel" type="button" onClick={cancelGroupEdit}>Cancel</Button>}
        </form><ul className="list-group mt-3">{groups.map((group) => <li className="list-group-item d-flex align-items-center gap-2" key={group.id}><span className="group-dot" style={{ background: group.color }} /><span className="flex-grow-1">{group.name} <span className="text-muted">({group.memberCount} active)</span></span><Button variant="edit" iconOnly size="sm" onClick={() => editGroup(group)} /><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => viewMembers(group.id)}>Members</button></li>)}</ul>
      </div></div></div>
      <div className="col-lg-8"><div className="card"><div className="card-body">
        <h5>Add employees to group</h5><form onSubmit={saveMembers}>
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label" htmlFor="member-group">Shift group</label>
              <select id="member-group" className="form-select" required value={memberForm.groupId} onChange={(e) => { setMemberForm({ ...memberForm, groupId: e.target.value }); viewMembers(e.target.value); }}><option value="">Select group</option>{groups.filter((g) => g.active).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="member-effective-from">Effective from</label>
              <input id="member-effective-from" type="date" required className="form-control" value={memberForm.effectiveFrom} onChange={(e) => setMemberForm({ ...memberForm, effectiveFrom: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="member-effective-until">Effective until <span className="text-muted">(optional)</span></label>
              <input id="member-effective-until" type="date" className="form-control" min={memberForm.effectiveFrom} value={memberForm.effectiveUntil} onChange={(e) => setMemberForm({ ...memberForm, effectiveUntil: e.target.value })} />
            </div>
          </div>
          <div className="member-picker">{employees.map((employee) => <label key={employee.id} className="form-check"><input type="checkbox" className="form-check-input" checked={memberForm.employeeIds.includes(employee.id)} onChange={() => setMemberForm((current) => ({ ...current, employeeIds: current.employeeIds.includes(employee.id) ? current.employeeIds.filter((id) => id !== employee.id) : [...current.employeeIds, employee.id] }))} /> {employee.fullName || employee.name}</label>)}</div>
          <Button variant="save" type="submit" className="mt-3">Add Members</Button>
        </form>
      </div></div></div>
      {rosterGroupId && <div className="col-12"><div className="card"><div className="card-body">
        <h5>Members of {groups.find((group) => String(group.id) === String(rosterGroupId))?.name}</h5>
        <div className="table-responsive"><table className="table table-sm table-hover align-middle mb-0">
          <thead><tr><th>Employee</th><th>DTR ID</th><th>Effective from</th><th>Effective until</th><th>Status</th><th></th></tr></thead>
          <tbody>{groupMembers.length === 0 ? <tr><td colSpan="6" className="text-center text-muted">No membership records for this group.</td></tr> : groupMembers.map((member) => <tr key={member.id}>
            <td>{member.fullName || member.name}</td><td>{member.dtrEmpId || "—"}</td><td>{member.effectiveFrom}</td><td>{member.effectiveUntil || "Ongoing"}</td>
            <td><span className={`badge ${member.membershipStatus === "Active" ? "text-bg-success" : member.membershipStatus === "Upcoming" ? "text-bg-info" : "text-bg-secondary"}`}>{member.membershipStatus}</span></td>
            <td className="text-end"><Button variant="delete" iconOnly size="sm" onClick={() => removeMember(member)} /></td>
          </tr>)}</tbody>
        </table></div>
      </div></div></div>}
    </div>}

    {section === "assign" && <><div className="card"><div className="card-body"><h5>{editingAssignmentId ? "Edit shift assignment" : "Assign shift by date range"}</h5><form className="row g-3" onSubmit={saveAssignment}>
      <div className="col-md-2"><label>Target</label><select className="form-select" value={assignment.targetType} onChange={(e) => setAssignment({ ...assignment, targetType: e.target.value, targetId: "" })}><option value="group">Shift group</option><option value="employee">Employee</option></select></div>
      <div className="col-md-3"><label>{assignment.targetType === "group" ? "Group" : "Employee"}</label><select required className="form-select" value={assignment.targetId} onChange={(e) => setAssignment({ ...assignment, targetId: e.target.value })}><option value="">Select</option>{(assignment.targetType === "group" ? groups : employees).map((item) => <option key={item.id} value={item.id}>{item.fullName || item.name}</option>)}</select></div>
      <div className="col-md-2"><label>Shift</label><select required className="form-select" value={assignment.shiftId} onChange={(e) => setAssignment({ ...assignment, shiftId: e.target.value })}><option value="">Select shift</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="col-md-2"><label>From</label><input required type="date" className="form-control" value={assignment.dateFrom} onChange={(e) => setAssignment({ ...assignment, dateFrom: e.target.value })} /></div>
      <div className="col-md-2"><label>To</label><input required type="date" className="form-control" value={assignment.dateTo} onChange={(e) => setAssignment({ ...assignment, dateTo: e.target.value })} /></div>
      <div className="col-12 d-flex flex-wrap gap-2"><span className="align-self-center me-1">Quick range:</span><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAssignmentRange("whole")}>Whole month</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAssignmentRange("first")}>1st–15th</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAssignmentRange("second")}>16th–End</button></div>
      <div className="col-12"><label className="me-3">Apply on:</label>{weekdayLabels.slice(0,7).map((label, day) => <label className="form-check form-check-inline" key={day}><input type="checkbox" className="form-check-input" checked={Boolean(assignment.weekdaysMask & (1 << day))} onChange={() => toggleWeekday(day)} />{label}</label>)}</div>
      <div className="col-12 d-flex gap-2"><button type="button" className="btn btn-outline-primary" onClick={previewAssignment}>Preview Employees</button><Button variant="save" type="submit">{editingAssignmentId ? "Update Assignment" : "Assign Shift"}</Button>{editingAssignmentId && <Button variant="cancel" type="button" onClick={() => { setEditingAssignmentId(null); setAssignmentPreview([]); }}>Cancel</Button>}</div>
      {assignmentPreview.length > 0 && <div className="col-12"><div className="alert alert-info mb-0"><strong>{assignmentPreview.length} affected active employee{assignmentPreview.length === 1 ? "" : "s"}:</strong> {assignmentPreview.map((employee) => employee.fullName || employee.name).join(", ")}</div></div>}
    </form></div></div>
    <div className="card mt-4"><div className="card-body"><h5>Assignment history</h5><div className="table-responsive"><table className="table table-sm table-hover align-middle mb-0">
      <thead><tr><th>Target</th><th>Shift</th><th>From</th><th>To</th><th>Days</th><th></th></tr></thead>
      <tbody>{assignments.length === 0 ? <tr><td colSpan="6" className="text-center text-muted">No shift assignments yet.</td></tr> : assignments.map((item) => <tr key={item.id}>
        <td>{item.groupName ? `Group: ${item.groupName}` : item.employeeName}</td><td>{item.shiftName}</td><td>{item.dateFrom}</td><td>{item.dateTo}</td>
        <td>{weekdayLabels.filter((_, day) => item.weekdaysMask & (1 << day)).join(", ")}</td>
        <td><div className="d-flex justify-content-end gap-2"><Button variant="edit" iconOnly size="sm" onClick={() => editAssignment(item)} /><Button variant="delete" iconOnly size="sm" onClick={() => deleteAssignment(item)} /></div></td>
      </tr>)}</tbody>
    </table></div></div></div></>}

    {section === "override" && <><div className="card"><div className="card-body"><h5>Single-date employee override</h5><p className="text-muted">You can open this form directly by clicking an employee/date cell in the Calendar.</p><form className="row g-3" onSubmit={saveOverride}>
      <div className="col-md-3"><label>Employee</label><select required className="form-select" value={override.employeeId} onChange={(e) => setOverride({ ...override, employeeId: e.target.value })}><option value="">Select employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.fullName || e.name}</option>)}</select></div>
      <div className="col-md-2"><label>Date</label><input required type="date" className="form-control" value={override.workDate} onChange={(e) => setOverride({ ...override, workDate: e.target.value })} /></div>
      <div className="col-md-2"><label>Type</label><select className="form-select" value={override.scheduleType} onChange={(e) => setOverride({ ...override, scheduleType: e.target.value })}><option value="WORK">Work</option><option value="REST">Rest</option><option value="LEAVE">Leave</option><option value="NO_WORK">No work</option></select></div>
      {override.scheduleType === "WORK" && <div className="col-md-2"><label>Shift</label><select required className="form-select" value={override.shiftId} onChange={(e) => setOverride({ ...override, shiftId: e.target.value })}><option value="">Select shift</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
      <div className="col-md-3"><label>Notes</label><input className="form-control" value={override.notes} onChange={(e) => setOverride({ ...override, notes: e.target.value })} /></div>
      <div className="col-12"><Button variant="save" type="submit">Save Override</Button></div>
    </form></div></div>
    <div className="card mt-4"><div className="card-body"><h5>Override history</h5><div className="table-responsive"><table className="table table-sm table-hover align-middle mb-0">
      <thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Shift</th><th>Notes</th><th></th></tr></thead>
      <tbody>{overrideRecords.length === 0 ? <tr><td colSpan="6" className="text-center text-muted">No employee overrides yet.</td></tr> : overrideRecords.map((record) => <tr key={record.id}>
        <td>{record.workDate}</td><td>{record.employeeName || record.employeeShortName}</td><td><span className={`badge ${record.scheduleType === "WORK" ? "text-bg-primary" : record.scheduleType === "LEAVE" ? "text-bg-warning bg-warning" : "text-bg-secondary"}`}>{record.scheduleType}</span></td><td>{record.shiftName || "—"}</td><td>{record.notes || "—"}</td>
        <td><div className="d-flex justify-content-end gap-2"><Button variant="edit" iconOnly size="sm" onClick={() => editOverride(record)} /><Button variant="delete" iconOnly size="sm" onClick={() => deleteOverride(record)} /></div></td>
      </tr>)}</tbody>
    </table></div></div></div></>}
  </div>;
};

export default DTRScheduling;
