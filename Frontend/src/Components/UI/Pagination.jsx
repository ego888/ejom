import React, { useState } from "react";

/**
 * Pagination Component
 * --------------------------
 * A component for handling page navigation in tables.
 * Shows ellipsis (...) when there are many pages:
 * - If current page is far from start: 1 ... 4 5 [6] 7 8
 * - If near start: 1 2 [3] 4 5 ...
 * - If near end: ... 96 97 [98] 99 100
 *
 * Includes a page input field to jump to any page directly.
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {function} props.onPageChange - Function to handle page changes
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const [inputPage, setInputPage] = useState("");

  const handlePageInput = (e) => {
    const value = e.target.value;
    setInputPage(value);
  };

  const handlePageSubmit = (e) => {
    if (e.key === "Enter") {
      const pageNumber = parseInt(inputPage);
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange(pageNumber);
        setInputPage("");
      }
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Page navigation"
      className="d-flex align-items-center gap-2"
    >
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
        </li>

        {currentPage > 3 && (
          <>
            <li className="page-item">
              <button className="page-link" onClick={() => onPageChange(1)}>
                1
              </button>
            </li>
            {currentPage > 4 && (
              <li className="page-item disabled">
                <span className="page-link">...</span>
              </li>
            )}
          </>
        )}

        {getPageNumbers().map((pageNum) => (
          <li
            key={pageNum}
            className={`page-item ${pageNum === currentPage ? "active" : ""}`}
          >
            <button className="page-link" onClick={() => onPageChange(pageNum)}>
              {pageNum}
            </button>
          </li>
        ))}

        {currentPage < totalPages - 2 && (
          <>
            {currentPage < totalPages - 3 && (
              <li className="page-item disabled">
                <span className="page-link">...</span>
              </li>
            )}
            <li className="page-item">
              <button
                className="page-link"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            </li>
          </>
        )}

        <li
          className={`page-item ${
            currentPage === totalPages ? "disabled" : ""
          }`}
        >
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </li>
      </ul>

      <input
        type="text"
        className="form-control form-control-sm"
        style={{ width: "50px", fontSize: "0.75rem", padding: "0.1rem 0.5rem" }}
        placeholder="Page"
        value={inputPage}
        onChange={handlePageInput}
        onKeyDown={handlePageSubmit}
        title="Press Enter to go to page"
      />
      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
        of {totalPages}
      </span>
    </nav>
  );
};

export default Pagination;
