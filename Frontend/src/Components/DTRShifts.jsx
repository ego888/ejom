import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import "./DTRShifts.css";

const emptyForm = {
  name: "",
  timeIn: "08:00",
  timeOut: "17:00",
  amBreakMinutes: 0,
  mealBreakStart: "12:00",
  mealBreakEnd: "13:00",
  pmBreakMinutes: 0,
  graceMinutes: 0,
  color: "#0d6efd",
  active: true,
};

const DTRShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ServerIP}/auth/dtr/shifts`);
      if (!response.data.Status) throw new Error(response.data.Error);
      setShifts(response.data.Shifts || []);
    } catch (error) {
      setMessage({ type: "danger", text: error.response?.data?.Error || error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const url = `${ServerIP}/auth/dtr/shifts${editingId ? `/${editingId}` : ""}`;
      const response = editingId
        ? await axios.put(url, form)
        : await axios.post(url, form);
      if (!response.data.Status) throw new Error(response.data.Error);
      setMessage({ type: "success", text: `Shift ${editingId ? "updated" : "created"}.` });
      resetForm();
      await fetchShifts();
    } catch (error) {
      setMessage({ type: "danger", text: error.response?.data?.Error || error.message });
    } finally {
      setSaving(false);
    }
  };

  const editShift = (shift) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      timeIn: shift.timeIn,
      timeOut: shift.timeOut,
      amBreakMinutes: shift.amBreakMinutes || 0,
      mealBreakStart: shift.mealBreakStart || "12:00",
      mealBreakEnd: shift.mealBreakEnd || "13:00",
      pmBreakMinutes: shift.pmBreakMinutes || 0,
      graceMinutes: shift.graceMinutes,
      color: shift.color,
      active: Boolean(shift.active),
    });
    setMessage(null);
  };

  const deleteShift = async (shift) => {
    if (!window.confirm(`Delete shift "${shift.name}"?`)) return;
    try {
      await axios.delete(`${ServerIP}/auth/dtr/shifts/${shift.id}`);
      if (editingId === shift.id) resetForm();
      await fetchShifts();
    } catch (error) {
      setMessage({ type: "danger", text: error.response?.data?.Error || error.message });
    }
  };

  return (
    <div className="dtr-shifts">
      <div className="card">
        <div className="card-header"><h4 className="mb-0">Shift Templates</h4></div>
        <div className="card-body">
          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
          <form className="shift-template-form" onSubmit={handleSubmit}>
            <div className="shift-field shift-name-field">
              <label className="form-label" htmlFor="shift-name">Shift name</label>
              <input id="shift-name" className="form-control" required maxLength={100}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="shift-in">Time in</label>
              <input id="shift-in" type="time" className="form-control" required
                value={form.timeIn} onChange={(e) => setForm({ ...form, timeIn: e.target.value })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="shift-out">Time out</label>
              <input id="shift-out" type="time" className="form-control" required
                value={form.timeOut} onChange={(e) => setForm({ ...form, timeOut: e.target.value })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="am-break">AM break</label>
              <input id="am-break" type="number" min="0" max="180" className="form-control"
                value={form.amBreakMinutes} onChange={(e) => setForm({ ...form, amBreakMinutes: Number(e.target.value) })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="meal-break-start">Meal break start</label>
              <input id="meal-break-start" type="time" className="form-control" required
                value={form.mealBreakStart} onChange={(e) => setForm({ ...form, mealBreakStart: e.target.value })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="meal-break-end">Meal break end</label>
              <input id="meal-break-end" type="time" className="form-control" required
                value={form.mealBreakEnd} onChange={(e) => setForm({ ...form, mealBreakEnd: e.target.value })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="pm-break">PM break</label>
              <input id="pm-break" type="number" min="0" max="180" className="form-control"
                value={form.pmBreakMinutes} onChange={(e) => setForm({ ...form, pmBreakMinutes: Number(e.target.value) })} />
            </div>
            <div className="shift-field">
              <label className="form-label" htmlFor="shift-grace">Grace (minutes)</label>
              <input id="shift-grace" type="number" min="0" max="180" className="form-control"
                value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })} />
            </div>
            <div className="shift-field shift-color-field">
              <label className="form-label" htmlFor="shift-color">Color</label>
              <input id="shift-color" type="color" className="form-control form-control-color"
                value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div className="shift-field shift-active-field">
              <div className="form-check mb-2">
                <input id="shift-active" type="checkbox" className="form-check-input"
                  checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <label className="form-check-label" htmlFor="shift-active">Active</label>
              </div>
            </div>
            <div className="shift-actions">
              <Button variant="save" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Shift" : "Add Shift"}
              </Button>
              {editingId && <Button variant="cancel" type="button" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </div>
      </div>

      <div className="table-responsive mt-4">
        <table className="table table-hover align-middle">
          <thead><tr><th>Name</th><th>Time in</th><th>Time out</th><th>AM break</th><th>Meal start</th><th>Meal end</th><th>PM break</th><th>Grace</th><th>Color</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="text-center">Loading shifts...</td></tr>
            ) : shifts.length === 0 ? (
              <tr><td colSpan="11" className="text-center text-muted">No shift templates yet.</td></tr>
            ) : shifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.name}</td>
                <td>{shift.timeIn}</td>
                <td>{shift.timeOut}</td>
                <td>{shift.amBreakMinutes} min</td>
                <td>{shift.mealBreakStart}</td>
                <td>{shift.mealBreakEnd}</td>
                <td>{shift.pmBreakMinutes} min</td>
                <td>{shift.graceMinutes} min</td>
                <td><span className="shift-color" style={{ backgroundColor: shift.color }} />{shift.color}</td>
                <td>{shift.active ? "Yes" : "No"}</td>
                <td><div className="d-flex gap-2">
                  <Button variant="edit" iconOnly size="sm" onClick={() => editShift(shift)} />
                  <Button variant="delete" iconOnly size="sm" onClick={() => deleteShift(shift)} />
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DTRShifts;
