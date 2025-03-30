import React, { useState, useEffect, useRef } from "react";
import { Modal } from "react-bootstrap";

const AddDateModal = ({
  show,
  onHide,
  onSave,
  batch,
  empId,
  empName,
  date,
  timeIn,
  timeOut,
}) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [localEmpId, setLocalEmpId] = useState(empId);
  const [localEmpName, setLocalEmpName] = useState(empName);
  const [localDate, setLocalDate] = useState(date);
  const [localTimeIn, setLocalTimeIn] = useState(timeIn);
  const [localTimeOut, setLocalTimeOut] = useState(timeOut);
  const timeInRef = useRef(null);

  useEffect(() => {
    if (show) {
      setLocalEmpId(empId);
      setLocalEmpName(empName);
      setLocalDate(date);
      setLocalTimeIn(timeIn);
      setLocalTimeOut(timeOut);
      fetchEmployees();

      // Focus on the time in field after modal is shown
      setTimeout(() => {
        if (timeInRef.current) {
          timeInRef.current.focus();
        }
      }, 300); // Slightly longer delay for modal animation
    }
  }, [show, empId, empName, date, timeIn, timeOut]);

  // ... rest of the component code ...

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Missing Date</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleAddDateSubmit}>
          {/* ... other form fields ... */}
          <div className="mb-3">
            <label className="form-label">Time In (HH:MM)</label>
            <input
              ref={timeInRef}
              type="time"
              className="form-control"
              value={localTimeIn}
              onChange={(e) => setLocalTimeIn(e.target.value)}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>
          {/* ... rest of the form ... */}
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default AddDateModal;
