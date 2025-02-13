import React, { useState, useEffect } from "react";
import "./StatusBadges.css";

// Add delay utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function StatusBadges({
  statusOptions,
  onStatusChange, // Will receive array of active statuses
  showProdFilter = true,
  isDisabled = false,
}) {
  // Initialize from localStorage with proper error handling
  const [activeStatuses, setActiveStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem("orderStatusFilter");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn("Error parsing status filters from localStorage:", error);
      localStorage.removeItem("orderStatusFilter"); // Clear invalid data
      return [];
    }
  });
  const [isProdChecked, setIsProdChecked] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);

  // Update localStorage whenever activeStatuses changes
  useEffect(() => {
    try {
      localStorage.setItem("orderStatusFilter", JSON.stringify(activeStatuses));
    } catch (error) {
      console.error("Error saving status filters to localStorage:", error);
    }
  }, [activeStatuses, onStatusChange]);

  // Initialize with default statuses if none exist
  useEffect(() => {
    if (statusOptions.length > 0 && activeStatuses.length === 0) {
      // Default to first two statuses (usually Open and Pending)
      const defaultStatuses = statusOptions.slice(0, 2).map((s) => s.statusId);
      setActiveStatuses(defaultStatuses);
    }
  }, [statusOptions]);

  const handleStatusToggle = async (statusId) => {
    if (isDisabled) return;

    let newActiveStatuses;
    if (activeStatuses.includes(statusId)) {
      newActiveStatuses = activeStatuses.filter((id) => id !== statusId);
    } else {
      newActiveStatuses = [...activeStatuses, statusId];
    }

    setActiveStatuses(newActiveStatuses);

    try {
      localStorage.setItem(
        "orderStatusFilter",
        JSON.stringify(newActiveStatuses)
      );
      await delay(0); // Ensure localStorage is updated
      console.log("activeStatuses toggle", newActiveStatuses);
      onStatusChange(newActiveStatuses);
    } catch (error) {
      console.error("Error saving status:", error);
    }
  };

  const handleProdCheckbox = async (e) => {
    if (isDisabled) return;
    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);

    let newActiveStatuses;
    if (e.target.checked) {
      newActiveStatuses = [...new Set([...activeStatuses, ...prodStatuses])];
    } else {
      newActiveStatuses = activeStatuses.filter(
        (id) => !prodStatuses.includes(id)
      );
    }

    setActiveStatuses(newActiveStatuses);
    setIsProdChecked(e.target.checked);

    try {
      localStorage.setItem(
        "orderStatusFilter",
        JSON.stringify(newActiveStatuses)
      );
      await delay(0); // Ensure localStorage is updated
      console.log("activeStatuses Prod", newActiveStatuses);
      onStatusChange(newActiveStatuses);
    } catch (error) {
      console.error("Error saving status:", error);
    }
  };

  const handleAllCheckbox = async (e) => {
    if (isDisabled) return;

    const newActiveStatuses = e.target.checked
      ? statusOptions.map((s) => s.statusId)
      : [];

    setActiveStatuses(newActiveStatuses);
    setIsAllChecked(e.target.checked);
    setIsProdChecked(e.target.checked);

    try {
      localStorage.setItem(
        "orderStatusFilter",
        JSON.stringify(newActiveStatuses)
      );
      await delay(0); // Ensure localStorage is updated
      console.log("activeStatuses All", newActiveStatuses);
      onStatusChange(newActiveStatuses);
    } catch (error) {
      console.error("Error saving status:", error);
    }
  };

  // Update checkbox states when active statuses change
  useEffect(() => {
    if (!statusOptions.length) return;

    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    setIsProdChecked(prodStatuses.every((id) => activeStatuses.includes(id)));
    setIsAllChecked(activeStatuses.length === statusOptions.length);
  }, [activeStatuses, statusOptions]);

  return (
    <div className="d-flex flex-column align-items-center gap-0">
      <div className="d-flex gap-1">
        {statusOptions.map((status) => (
          <button
            key={status.statusId}
            className={`status-badge ${
              activeStatuses.includes(status.statusId) ? "active" : "inactive"
            }`}
            onClick={() => handleStatusToggle(status.statusId)}
          >
            {status.statusId}
          </button>
        ))}
      </div>

      {showProdFilter && (
        <>
          <div
            className="position-relative w-100"
            style={{ padding: "0.25rem 0" }}
          >
            <div className="divider-line half"></div>
            <div className="checkbox-container">
              <div className="checkbox-wrapper transparent">
                <input
                  id="prodStatusFilter"
                  type="checkbox"
                  className="form-check-input me-1"
                  checked={isProdChecked}
                  onChange={handleProdCheckbox}
                />
                <label htmlFor="prodStatusFilter">Prod</label>
              </div>
            </div>
          </div>

          <div
            className="position-relative w-100"
            style={{ padding: "0rem 0" }}
          >
            <div className="divider-line full"></div>
            <div className="checkbox-container">
              <div className="checkbox-wrapper transparent">
                <input
                  id="allStatusFilter"
                  type="checkbox"
                  className="form-check-input me-1"
                  checked={isAllChecked}
                  onChange={handleAllCheckbox}
                />
                <label htmlFor="allStatusFilter">All</label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StatusBadges;
