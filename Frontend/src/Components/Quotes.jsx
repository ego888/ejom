import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import "./Quotes.css";
import axios from "../utils/axiosConfig"; // Import configured axios

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
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem("quotesSortConfig");
    return saved
      ? JSON.parse(saved)
      : {
          key: "id",
          direction: "desc",
        };
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    const saved = localStorage.getItem("quoteStatusFilters");
    return saved ? JSON.parse(saved) : [];
  });
  const [isAllChecked, setIsAllChecked] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  const [hasClientFilter, setHasClientFilter] = useState(false);
  const [hasSalesFilter, setHasSalesFilter] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const salesFilterRef = useRef(null);
  const clientFilterRef = useRef(null);

  const fetchQuotes = async () => {
    try {
      let url = `${ServerIP}/auth/quotes?page=${currentPage}&limit=${recordsPerPage}&sortBy=${sortConfig.key}&sortDirection=${sortConfig.direction}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (selectedSales.length > 0) {
        url += `&sales=${encodeURIComponent(selectedSales.join(","))}`;
      }

      if (selectedStatuses.length > 0) {
        url += `&statuses=${encodeURIComponent(selectedStatuses.join(","))}`;
      }

      if (selectedClients.length > 0) {
        url += `&clients=${encodeURIComponent(selectedClients.join(","))}`;
      }

      const response = await axios.get(url);
      if (response.data.Status) {
        setQuotes(response.data.Result.quotes);
        setTotalCount(response.data.Result.total);
        setTotalPages(response.data.Result.totalPages);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
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
    selectedClients,
    selectedSales,
  ]);

  // Fetch clients and sales employees
  useEffect(() => {
    // Fetch initial data
    Promise.all([
      axios.get(`${ServerIP}/auth/sales_employees`),
      axios.get(`${ServerIP}/auth/clients`),
    ])
      .then(([salesRes, clientsRes]) => {
        if (salesRes.data.Status) {
          setSalesEmployees(salesRes.data.Result);
        }
        if (clientsRes.data.Status) {
          setClientList(clientsRes.data.Result);
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });

    fetchQuotes();
  }, []);

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
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    setCurrentPage(1);
    localStorage.setItem("quotesSortConfig", JSON.stringify(newSortConfig));
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

  // Handle client selection from ClientFilter
  const handleClientSelection = (newSelectedClients) => {
    setSelectedClients(newSelectedClients);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  return (
    <div className="quote">
      <div className="quote-page-background px-5 ">
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

        <div className="table-responsive">
          <SalesFilter
            ref={salesFilterRef}
            salesEmployees={salesEmployees}
            selectedSales={selectedSales}
            setSelectedSales={setSelectedSales}
            onFilterUpdate={({ isFilterActive }) =>
              setHasSalesFilter(isFilterActive)
            }
          />
          <ClientFilter
            ref={clientFilterRef}
            clientList={clientList}
            selectedClients={selectedClients}
            setSelectedClients={setSelectedClients}
            onFilterUpdate={({ isFilterActive }) =>
              setHasClientFilter(isFilterActive)
            }
          />
          <table className="table table-striped table-hover">
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
                  onClick={() => handleSort("clientName")}
                  style={{
                    cursor: "pointer",
                    color: hasClientFilter ? "#0d6efd" : "inherit",
                  }}
                >
                  Client {getSortIndicator("clientName")}
                </th>
                <th>Project Name</th>
                <th>Ordered By</th>
                <th>Due Date</th>
                <th>Due Time</th>
                <th
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status {getSortIndicator("status")}
                </th>
                <th>Grand Total</th>
                <th
                  onClick={() => handleSort("salesName")}
                  style={{
                    cursor: "pointer",
                    color: hasSalesFilter ? "#0d6efd" : "inherit",
                  }}
                >
                  Sales {getSortIndicator("salesName")}
                </th>
                <th>Quote Ref</th>
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
                  <td
                    className="client-cell"
                    onClick={(e) => {
                      if (clientFilterRef.current) {
                        clientFilterRef.current.toggleFilterMenu(e);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {quote.clientName}
                  </td>
                  <td>{quote.projectName}</td>
                  <td>{quote.orderedBy}</td>
                  <td>
                    {quote.dueDate
                      ? new Date(quote.dueDate).toLocaleDateString()
                      : ""}
                  </td>
                  <td>{quote.dueTime || ""}</td>
                  <td>
                    <span className={`status-badge ${quote.status}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td>
                    {quote.grandTotal
                      ? `₱${quote.grandTotal.toLocaleString()}`
                      : ""}
                  </td>
                  <td
                    className="sales-cell"
                    onClick={(e) => {
                      if (salesFilterRef.current) {
                        salesFilterRef.current.toggleFilterMenu(e);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {quote.salesName}
                  </td>
                  <td>{quote.quoteReference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination and Filters Section */}
        <div className="d-flex justify-content-between align-items-start mt-3">
          <DisplayPage
            recordsPerPage={recordsPerPage}
            setRecordsPerPage={setRecordsPerPage}
            currentPage={currentPage}
            totalCount={totalCount}
            setCurrentPage={setCurrentPage}
          />

          {/* Status filter badges */}
          <div className="d-flex flex-column align-items-center gap-0">
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={paginate}
          />
        </div>
      </div>
    </div>
  );
}

export default Quotes;
