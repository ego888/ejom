import React from "react";

/**
 * DisplayPage Component
 * --------------------------
 * A component for selecting the number of records to display per page
 * and showing the current range of records being displayed.
 *
 * @param {Object} props
 * @param {number} props.recordsPerPage - Current number of records per page
 * @param {function} props.setRecordsPerPage - Function to update records per page
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalCount - Total number of records
 * @param {function} props.setCurrentPage - Function to update current page
 */
const DisplayPage = ({
  recordsPerPage,
  setRecordsPerPage,
  currentPage,
  totalCount,
  setCurrentPage,
}) => {
  return (
    <div className="d-flex align-items-center gap-2">
      <label htmlFor="recordsPerPage" className="visually-hidden">
        Records per page
      </label>
      <select
        id="recordsPerPage"
        name="recordsPerPage"
        className="form-select form-select-sm"
        style={{
          width: "auto",
          fontSize: "0.75rem",
          padding: "0.1rem 1.5rem 0.1rem 0.5rem",
          height: "auto",
        }}
        value={recordsPerPage}
        onChange={(e) => {
          setRecordsPerPage(Number(e.target.value));
          setCurrentPage(1);
        }}
        aria-label="Number of records to display per page"
      >
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
        <option value={100}>100 / page</option>
      </select>
      <div
        className="text-muted"
        style={{ fontSize: "0.75rem" }}
        aria-live="polite"
        role="status"
      >
        {(currentPage - 1) * recordsPerPage + 1} to{" "}
        {Math.min(currentPage * recordsPerPage, totalCount)} of {totalCount}{" "}
        entries
      </div>
    </div>
  );
};

export default DisplayPage;
