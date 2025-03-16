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
    if (selectedStatuses.length === 0) {
      setQuotes([]);
      setTotalCount(0);
      return;
    }
    console.log("FETCHING QUOTES");
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        search: searchTerm,
        statuses: selectedStatuses.join(","),
        sales: selectedSales.length ? selectedSales.join(",") : undefined,
        clients: selectedClients.length ? selectedClients.join(",") : undefined,
      };

      const response = await axios.get(`${ServerIP}/auth/quotes`, { params });
      console.log("RESPONSE", response.data);
      if (response.data.Status) {
        setQuotes(response.data.Result.quotes);
        setTotalCount(response.data.Result.total);
        setTotalPages(response.data.Result.totalPages);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      setQuotes([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Single initialization effect
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Fetch all initial data in parallel
        const [statusResponse, salesResponse, clientsResponse] =
          await Promise.all([
            axios.get(`${ServerIP}/auth/quote-statuses`),
            axios.get(`${ServerIP}/auth/sales_employees`),
            axios.get(`${ServerIP}/auth/clients`),
          ]);

        // Handle status options
        if (statusResponse.data.Status) {
          const sortedStatuses = statusResponse.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);

          // Get saved filters or default to first two statuses
          const saved = localStorage.getItem("quoteStatusFilters");
          if (saved) {
            const savedStatuses = JSON.parse(saved);
            setSelectedStatuses(savedStatuses);
            setIsAllChecked(savedStatuses.length === sortedStatuses.length);
          } else {
            const firstTwoStatuses = sortedStatuses
              .slice(0, 2)
              .map((s) => s.statusId);
            setSelectedStatuses(firstTwoStatuses);
            localStorage.setItem(
              "quoteStatusFilters",
              JSON.stringify(firstTwoStatuses)
            );
            setIsAllChecked(firstTwoStatuses.length === sortedStatuses.length);
          }
        }

        // Handle other responses
        if (salesResponse.data.Status)
          setSalesEmployees(salesResponse.data.Result);
        if (clientsResponse.data.Status)
          setClientList(clientsResponse.data.Result);
      } catch (error) {
        console.error("Error in initialization:", error);
      }
    };

    initializeComponent();
  }, []); // Run once on mount

  // Single effect for data fetching with debounce
  useEffect(() => {
    const timeoutId = setTimeout(fetchQuotes, searchTerm ? 500 : 0);
    return () => clearTimeout(timeoutId);
  }, [
    selectedStatuses,
    currentPage,
    recordsPerPage,
    sortConfig,
    searchTerm,
    selectedSales,
    selectedClients,
  ]);

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
          <div className="search-container">
            <label htmlFor="quoteSearch" className="visually-hidden">
              Search quotes
            </label>
            <input
              id="quoteSearch"
              name="quoteSearch"
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by ID, client..."
              onChange={handleSearch}
              style={{ width: "400px" }}
              aria-label="Search quotes"
            />
          </div>
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
                <th className="text-center">Action</th>
                <th
                  className="text-center"
                  onClick={() => handleSort("quoteId")}
                  style={{ cursor: "pointer" }}
                >
                  Quote ID {getSortIndicator("quoteId")}
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("quoteDate")}
                  style={{ cursor: "pointer" }}
                >
                  Quote Date {getSortIndicator("quoteDate")}
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("clientName")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  Client {getSortIndicator("clientName")}
                </th>
                <th className="text-center">Project Name</th>
                <th className="text-center">Ordered By</th>
                <th className="text-center">Due Date</th>
                <th className="text-center">Due Time</th>
                <th
                  className="text-center"
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status {getSortIndicator("status")}
                </th>
                <th className="text-center">Grand Total</th>
                <th
                  className="text-center"
                  onClick={() => handleSort("salesName")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  Sales {getSortIndicator("salesName")}
                </th>
                <th className="text-center">Quote Ref</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
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
                  <td>{quote.quoteDate}</td>
                  <td
                    className="client-cell"
                    onClick={(e) => {
                      if (clientFilterRef.current) {
                        clientFilterRef.current.toggleFilterMenu(e);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div>{quote.clientName}</div>
                    {quote.customerName && (
                      <div className="small text-muted">
                        {quote.customerName}
                      </div>
                    )}
                  </td>
                  <td>{quote.projectName}</td>
                  <td>{quote.orderedBy}</td>
                  <td>
                    {quote.dueDate
                      ? new Date(quote.dueDate).toLocaleDateString()
                      : ""}
                  </td>
                  <td>{quote.dueTime || ""}</td>
                  <td className="text-center">
                    <span className={`status-badge ${quote.status}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="number_right">
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
            selectProps={{
              id: "quotesPerPage",
              name: "quotesPerPage",
              "aria-label": "Number of quotes per page",
            }}
          />

          {/* Status filter badges */}
          <div className="d-flex flex-column align-items-center gap-0">
            <div className="d-flex justify-content-center gap-1 w-100">
              {statusOptions.map((status) => (
                <button
                  key={status.statusId}
                  id={`status-${status.statusId}`}
                  name={`status-${status.statusId}`}
                  className={`badge ${
                    selectedStatuses.includes(status.statusId)
                      ? "bg-primary"
                      : "bg-secondary"
                  }`}
                  onClick={() => handleStatusFilter(status.statusId)}
                  aria-label={`Filter by status ${status.statusId}`}
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
              <div className="d-flex justify-content-center">
                <div className="d-flex align-items-center bg-white px-2">
                  <input
                    id="selectAllStatuses"
                    name="selectAllStatuses"
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
                  <label
                    htmlFor="selectAllStatuses"
                    className="form-check-label"
                  >
                    All
                  </label>
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
