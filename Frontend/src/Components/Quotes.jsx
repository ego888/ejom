import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import "./Quotes.css";

function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem("quotesListPage")) || 1;
  });
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "quoteId",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    const saved = localStorage.getItem("quoteStatusFilters");
    return saved ? JSON.parse(saved) : [];
  });
  const [isAllChecked, setIsAllChecked] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/quotes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: recordsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
          search: searchTerm,
          statuses: selectedStatuses.length
            ? selectedStatuses.join(",")
            : undefined,
        },
      });

      if (response.data.Status) {
        setQuotes(response.data.Result.quotes);
        setTotalCount(response.data.Result.total);
      }
    } catch (err) {
      console.error("Error fetching quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch quotes when parameters change
  useEffect(() => {
    if (selectedStatuses.length === 0 && statusOptions.length > 0) {
      setQuotes([]);
      setTotalCount(0);
    } else {
      fetchQuotes();
    }
  }, [
    currentPage,
    recordsPerPage,
    sortConfig,
    searchTerm,
    selectedStatuses,
    statusOptions,
  ]);

  // Fetch status options
  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/quote-statuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          const sortedStatuses = response.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);

          // Get saved filters or default to first two statuses
          const saved = localStorage.getItem("quoteStatusFilters");
          if (saved) {
            const savedStatuses = JSON.parse(saved);
            setSelectedStatuses(savedStatuses);
            // Update All checkbox state based on saved statuses
            setIsAllChecked(savedStatuses.length === sortedStatuses.length);
          } else {
            // Define firstTwoStatuses before using it
            const firstTwoStatuses = sortedStatuses
              .slice(0, 2)
              .map((s) => s.statusId);
            setSelectedStatuses(firstTwoStatuses);
            localStorage.setItem(
              "quoteStatusFilters",
              JSON.stringify(firstTwoStatuses)
            );
            // Update All checkbox state based on first two statuses
            setIsAllChecked(firstTwoStatuses.length === sortedStatuses.length);
          }
        }
      } catch (err) {
        console.error("Error fetching status options:", err);
      }
    };
    fetchStatusOptions();
  }, []);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 500),
    []
  );

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    debouncedSearch(term);
  };

  // Sort handler
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Status filter handlers
  const handleStatusFilter = (statusId) => {
    setSelectedStatuses((prev) => {
      let newStatuses;
      if (prev.includes(statusId)) {
        newStatuses = prev.filter((s) => s !== statusId);
      } else {
        newStatuses = [...prev, statusId];
      }
      // Save to localStorage
      localStorage.setItem("quoteStatusFilters", JSON.stringify(newStatuses));
      return newStatuses;
    });
  };

  // Helper function for sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  // Calculate pagination values
  useEffect(() => {
    setTotalPages(Math.ceil(totalCount / recordsPerPage));
  }, [totalCount, recordsPerPage]);

  // Add cleanup effect to save the page when unmounting
  useEffect(() => {
    return () => {
      localStorage.setItem("quotesListPage", currentPage.toString());
    };
  }, [currentPage]);

  // Modify the page change handler
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    localStorage.setItem("quotesListPage", pageNumber.toString());
  };

  // Handle records per page change
  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page
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

  const handleAllCheckbox = (e) => {
    let newStatuses = [];
    if (e.target.checked) {
      newStatuses = statusOptions.map((s) => s.statusId);
    }
    setSelectedStatuses(newStatuses);
    setIsAllChecked(e.target.checked);

    // Save to localStorage
    localStorage.setItem("quoteStatusFilters", JSON.stringify(newStatuses));
  };

  const isAllIndeterminate = () => {
    return (
      selectedStatuses.length > 0 &&
      selectedStatuses.length < statusOptions.length
    );
  };

  return (
    <div className="quote-page-background">
      <div className="px-5 mt-3">
        <div className="quote-header d-flex justify-content-center">
          <h3>Quotes List</h3>
        </div>

        {/* Search and filters row */}
        <div className="d-flex justify-content-between mb-3">
          <Button
            variant="add"
            onClick={() => navigate("/dashboard/quotes/add")}
          >
            Add Quote
          </Button>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by ID, client, project, ordered by, DR#, INV#, OR#, sales, amount, ref..."
            onChange={handleSearch}
            style={{ width: "400px" }}
          />
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        <div className="quote-table-container mt-3">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Action</th>
                <th
                  onClick={() => handleSort("quoteId")}
                  style={{ cursor: "pointer" }}
                >
                  Quote ID {getSortIndicator("quoteId")}
                </th>
                <th
                  onClick={() => handleSort("clientId")}
                  style={{ cursor: "pointer" }}
                >
                  Client ID {getSortIndicator("clientId")}
                </th>
                <th>Project Name</th>
                <th>Prepared By</th>
                <th>Quote Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Amount Discount</th>
                <th>Percent Discount</th>
                <th>Grand Total</th>
                <th>Total Hours</th>
                <th>Status Remarks</th>
                <th>Reference ID</th>
                <th>Edited By</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
                      <Button
                        variant="view"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/view_quote/${quote.id}`)
                        }
                      />
                      <Button
                        variant="edit"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/quotes/edit/${quote.id}`)
                        }
                      />
                    </div>
                  </td>
                  <td>{quote.id}</td>
                  <td>{quote.clientId}</td>
                  <td>{quote.projectName}</td>
                  <td>{quote.preparedBy}</td>
                  <td>
                    {quote.quoteDate
                      ? new Date(quote.quoteDate).toLocaleDateString()
                      : ""}
                  </td>
                  <td>
                    {quote.dueDate
                      ? new Date(quote.dueDate).toLocaleDateString()
                      : ""}
                  </td>
                  <td>
                    <span className={`status-badge ${quote.status}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td>
                    {quote.totalAmount
                      ? `₱${quote.totalAmount.toLocaleString()}`
                      : ""}
                  </td>
                  <td>
                    {quote.amountDiscount
                      ? `₱${quote.amountDiscount.toLocaleString()}`
                      : ""}
                  </td>
                  <td>{quote.percentDisc || ""}</td>
                  <td>
                    {quote.grandTotal
                      ? `₱${quote.grandTotal.toLocaleString()}`
                      : ""}
                  </td>
                  <td>{quote.totalHrs || ""}</td>
                  <td>{quote.statusRem || ""}</td>
                  <td>{quote.refId || ""}</td>
                  <td>{quote.editedBy || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination and Filters Section */}
        <div className="d-flex justify-content-between align-items-start mt-3">
          {/* Records per page selector */}
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm quote-records-info"
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
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div
              className="quote-records-info text-muted"
              style={{ fontSize: "0.75rem" }}
            >
              {(currentPage - 1) * recordsPerPage + 1} to{" "}
              {Math.min(currentPage * recordsPerPage, totalCount)} of{" "}
              {totalCount} entries
            </div>
          </div>

          {/* Status filter badges */}
          <div
            className="d-flex flex-column align-items-center gap-0"
            style={{ minWidth: "400px" }}
          >
            {/* Status Badges */}
            <div className="d-flex justify-content-center gap-1 w-100">
              {statusOptions.map((status) => (
                <button
                  key={status.statusId}
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
                >
                  {status.statusId}
                </button>
              ))}
            </div>

            {/* All Checkbox */}
            <div
              className="position-relative w-100"
              style={{ padding: "0.25rem 0" }}
            >
              <div
                className="position-absolute"
                style={{
                  height: "1px",
                  backgroundColor: "#ccc",
                  width: "100%",
                  top: "50%",
                  zIndex: 0,
                }}
              ></div>
              <div
                className="d-flex justify-content-center"
                style={{ position: "relative", zIndex: 1 }}
              >
                <div
                  className="d-flex align-items-center bg-white px-2"
                  style={{ backgroundColor: "transparent" }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input me-1"
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isAllIndeterminate();
                      }
                    }}
                    checked={isAllChecked}
                    onChange={handleAllCheckbox}
                  />
                  <label className="form-check-label">All</label>
                </div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                  style={{ fontSize: "0.75rem" }}
                >
                  First
                </button>
              </li>
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ fontSize: "0.75rem" }}
                >
                  Previous
                </button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li
                  key={i + 1}
                  className={`page-item ${
                    currentPage === i + 1 ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => paginate(i + 1)}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ fontSize: "0.75rem" }}
                >
                  Next
                </button>
              </li>
              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{ fontSize: "0.75rem" }}
                >
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Quotes;
