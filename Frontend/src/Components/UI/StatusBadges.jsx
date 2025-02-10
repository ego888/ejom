import React, { useRef } from "react";
import "./StatusBadges.css";

function StatusBadges({
  statusOptions,
  selectedStatuses,
  onStatusChange,
  showProdFilter = true,
  isDisabled = false,
}) {
  const [isProdChecked, setIsProdChecked] = React.useState(false);
  const [isAllChecked, setIsAllChecked] = React.useState(false);

  // Effect to update checkbox states when selectedStatuses or statusOptions change
  React.useEffect(() => {
    if (statusOptions && statusOptions.length > 0) {
      updateCheckboxStates(selectedStatuses);
    }
  }, [selectedStatuses, statusOptions]);

  const handleStatusFilter = (statusId) => {
    if (isDisabled) return;

    let newStatuses;
    if (selectedStatuses.includes(statusId)) {
      newStatuses = selectedStatuses.filter((id) => id !== statusId);
    } else {
      newStatuses = [...selectedStatuses, statusId];
    }

    console.log("New statuses after toggle (StatusBadges):", newStatuses); // Debugging log
    // Always call onStatusChange with the new statuses
    onStatusChange(newStatuses);

    // Update checkbox states after the status change
    updateCheckboxStates(newStatuses);
  };

  const handleProdCheckbox = (e) => {
    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    let newStatuses;
    if (e.target.checked) {
      newStatuses = [...new Set([...selectedStatuses, ...prodStatuses])];
    } else {
      newStatuses = selectedStatuses.filter((s) => !prodStatuses.includes(s));
    }

    onStatusChange(newStatuses);
    updateCheckboxStates(newStatuses);
  };

  const handleAllCheckbox = (e) => {
    let newStatuses = [];
    if (e.target.checked) {
      newStatuses = statusOptions.map((s) => s.statusId);
    }
    onStatusChange(newStatuses);
    updateCheckboxStates(newStatuses);
  };

  const updateCheckboxStates = (statuses) => {
    if (!statusOptions || statusOptions.length === 0) return;

    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    const isProdSelected = prodStatuses.every((status) =>
      statuses.includes(status)
    );
    setIsProdChecked(isProdSelected);
    setIsAllChecked(statuses.length === statusOptions.length);
  };

  const isProdIndeterminate = () => {
    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    const selectedProdStatuses = selectedStatuses.filter((s) =>
      prodStatuses.includes(s)
    );
    return (
      selectedProdStatuses.length > 0 &&
      selectedProdStatuses.length < prodStatuses.length
    );
  };

  const isAllIndeterminate = () => {
    return (
      selectedStatuses.length > 0 &&
      selectedStatuses.length < statusOptions.length
    );
  };

  return (
    <div className="d-flex flex-column align-items-center gap-0">
      {/* Status Badges */}
      <div className="d-flex gap-1">
        {statusOptions && statusOptions.length > 0 ? (
          statusOptions.map((status) => (
            <button
              key={status.statusId}
              id={`status-${status.statusId}`}
              className={`badge ${
                selectedStatuses.includes(status.statusId)
                  ? "bg-primary"
                  : "bg-secondary"
              }`}
              onClick={() => handleStatusFilter(status.statusId)}
              style={{
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                minWidth: "60px",
                padding: "0.35em 0.65em",
              }}
              aria-label={`Filter by status ${status.statusId}`}
              aria-pressed={selectedStatuses.includes(status.statusId)}
              role="button"
            >
              {status.statusId}
            </button>
          ))
        ) : (
          <div role="status" aria-live="polite">
            Loading statuses...
          </div>
        )}
      </div>

      {showProdFilter && (
        <>
          {/* Prod Section */}
          <div
            className="position-relative w-100"
            style={{ padding: "0.25rem 0" }}
          >
            <div className="divider-line half"></div>
            <div className="checkbox-container">
              <div className="checkbox-wrapper transparent">
                <input
                  id="prodStatusFilter"
                  name="prodStatusFilter"
                  type="checkbox"
                  className="form-check-input me-1"
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isProdIndeterminate();
                    }
                  }}
                  checked={isProdChecked}
                  onChange={handleProdCheckbox}
                  aria-label="Filter production statuses"
                />
                <label htmlFor="prodStatusFilter" className="form-check-label">
                  Prod
                </label>
              </div>
            </div>
          </div>

          {/* All Section */}
          <div
            className="position-relative w-100"
            style={{ padding: "0rem 0" }}
          >
            <div className="divider-line full"></div>
            <div className="checkbox-container">
              <div className="checkbox-wrapper transparent">
                <input
                  id="allStatusFilter"
                  name="allStatusFilter"
                  type="checkbox"
                  className="form-check-input me-1"
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isAllIndeterminate();
                    }
                  }}
                  checked={isAllChecked}
                  onChange={handleAllCheckbox}
                  aria-label="Select all statuses"
                />
                <label htmlFor="allStatusFilter" className="form-check-label">
                  All
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StatusBadges;
