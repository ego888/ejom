import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import StatusBadges from "./UI/StatusBadges";
import "./Quotes.css";
import axios from "../utils/axiosConfig"; // Import configured axios
import { formatPeso } from "../utils/orderUtils";
import ModalAlert from "../Components/UI/ModalAlert";
import Modal from "./UI/Modal";
import ViewCustomerInfo from "./UI/ViewCustomerInfo";
import { getClientBackgroundStyle } from "../utils/clientOverdueStyle";

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
  const [displaySearchTerm, setDisplaySearchTerm] = useState("");
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
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const hoverTimerRef = useRef(null);
  const [clickTimer, setClickTimer] = useState(null);

  const fetchQuotes = async () => {
    console.log("FETCHING QUOTES with statuses:", selectedStatuses);
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        search: searchTerm,
        statuses: selectedStatuses.length
          ? selectedStatuses.join(",")
          : undefined,
        sales: selectedSales.length ? selectedSales.join(",") : undefined,
        clients: selectedClients.length ? selectedClients.join(",") : undefined,
      };

      console.log("Fetching with params:", params);
      const response = await axios.get(`${ServerIP}/auth/quotes`, { params });
      console.log("QUOTES RESPONSE:", response.data);

      if (response.data.Status) {
        // Process quotes to ensure hold and overdue dates are properly set
        const processedQuotes = response.data.Result.quotes.map((quote) => {
          // If hold or overdue dates are missing, fetch them from the client data
          if (!quote.hold || !quote.overdue) {
            return axios
              .get(`${ServerIP}/auth/client/${quote.clientId}`)
              .then((clientResponse) => {
                if (clientResponse.data.Status) {
                  const clientData = clientResponse.data.Result;
                  return {
                    ...quote,
                    hold: clientData.hold || null,
                    overdue: clientData.overdue || null,
                  };
                }
                return quote;
              })
              .catch(() => quote); // If client fetch fails, return original quote
          }
          return Promise.resolve(quote);
        });

        // Wait for all client data fetches to complete
        const quotesWithDates = await Promise.all(processedQuotes);

        setQuotes(quotesWithDates);
        setTotalCount(response.data.Result.total || 0);
        setTotalPages(response.data.Result.totalPages || 0);
      } else {
        console.warn("Failed to fetch quotes:", response.data.Error);
        setQuotes([]);
        setTotalCount(0);
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
        // Initialize search terms from localStorage
        const savedSearch = localStorage.getItem("quotesSearchTerm") || "";
        setSearchTerm(savedSearch);
        setDisplaySearchTerm(savedSearch);

        // Fetch all initial data in parallel
        const [statusResponse, salesResponse, clientsResponse] =
          await Promise.all([
            axios.get(`${ServerIP}/auth/quote-statuses`),
            axios.get(`${ServerIP}/auth/sales_employees`),
            axios.get(`${ServerIP}/auth/clients`),
          ]);

        // Handle status options
        console.log("Status Response:", statusResponse.data);
        if (
          statusResponse.data.Status &&
          Array.isArray(statusResponse.data.Result) &&
          statusResponse.data.Result.length > 0
        ) {
          const statusData = statusResponse.data.Result;
          console.log("Status Data:", statusData);
          setStatusOptions(statusData);

          // Get saved filters or default to first two statuses
          const saved = localStorage.getItem("quoteStatusFilters");
          if (saved) {
            try {
              const savedStatuses = JSON.parse(saved);
              if (Array.isArray(savedStatuses) && savedStatuses.length > 0) {
                setSelectedStatuses(savedStatuses);
                setIsAllChecked(savedStatuses.length === statusData.length);
              } else {
                // If saved data is invalid, set defaults
                const defaultStatuses = statusData
                  .slice(0, 2)
                  .map((s) => s.statusId);
                setSelectedStatuses(defaultStatuses);
                localStorage.setItem(
                  "quoteStatusFilters",
                  JSON.stringify(defaultStatuses)
                );
              }
            } catch (e) {
              console.warn("Error parsing saved status filters:", e);
              const defaultStatuses = statusData
                .slice(0, 2)
                .map((s) => s.statusId);
              setSelectedStatuses(defaultStatuses);
              localStorage.setItem(
                "quoteStatusFilters",
                JSON.stringify(defaultStatuses)
              );
            }
          } else {
            // No saved filters, set defaults
            const defaultStatuses = statusData
              .slice(0, 2)
              .map((s) => s.statusId);
            setSelectedStatuses(defaultStatuses);
            localStorage.setItem(
              "quoteStatusFilters",
              JSON.stringify(defaultStatuses)
            );
          }
        } else {
          console.warn(
            "No status options received from server, using defaults"
          );
          // Set some default statuses if the server returns none
          const defaultStatusOptions = [
            { statusId: "Open", step: 1 },
            { statusId: "Pending", step: 2 },
          ];
          setStatusOptions(defaultStatusOptions);
          setSelectedStatuses(["Open"]);
          localStorage.setItem("quoteStatusFilters", JSON.stringify(["Open"]));
        }

        // Handle other responses
        if (
          salesResponse.data.Status &&
          Array.isArray(salesResponse.data.Result)
        ) {
          setSalesEmployees(salesResponse.data.Result);
        } else {
          setSalesEmployees([]);
        }

        if (
          clientsResponse.data.Status &&
          Array.isArray(clientsResponse.data.Result)
        ) {
          setClientList(clientsResponse.data.Result);
        } else {
          setClientList([]);
        }
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
      setDisplaySearchTerm(term);
      setCurrentPage(1);
      localStorage.setItem("quotesSearchTerm", term);
    }, 500),
    []
  );

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setDisplaySearchTerm(term);
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

  const handleClientHover = (clientId) => {
    hoverTimerRef.current = setTimeout(() => {
      setSelectedClientId(clientId);
      setShowClientInfo(true);
    }); // 5 seconds
  };

  const handleClientLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
  };

  // Add cleanup for the timer
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleClientClick = (clientId, e) => {
    if (clickTimer === null) {
      // First click, wait to see if it's a double click
      setClickTimer(
        setTimeout(() => {
          // Single click action
          if (clientFilterRef.current) {
            clientFilterRef.current.toggleFilterMenu(e);
          }
          setClickTimer(null);
        }, 250) // 250ms delay to detect double click
      );
    } else {
      // Second click within 250ms, it's a double click
      clearTimeout(clickTimer);
      setClickTimer(null);
      handleClientHover(clientId);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
    };
  }, [clickTimer]);

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
            <div className="position-relative">
              <input
                id="quoteSearch"
                name="quoteSearch"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by ID, client..."
                onChange={handleSearch}
                value={displaySearchTerm}
                style={{
                  width: "400px",
                  paddingRight: displaySearchTerm ? "30px" : "12px",
                }}
                aria-label="Search quotes"
              />
              {displaySearchTerm && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute"
                  style={{
                    right: "5px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#6c757d",
                    fontSize: "14px",
                    padding: "0",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => {
                    setDisplaySearchTerm("");
                    setSearchTerm("");
                    localStorage.setItem("quotesSearchTerm", "");
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
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
                  className={`text-center ${
                    hasClientFilter ? "active-filter" : ""
                  }`}
                  onClick={() => handleSort("clientName")}
                  style={{ cursor: "pointer" }}
                >
                  Client {getSortIndicator("clientName")}
                  {hasClientFilter && (
                    <span className="filter-indicator filter-icon"></span>
                  )}
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
                  className={`text-center ${
                    hasSalesFilter ? "active-filter" : ""
                  }`}
                  onClick={() => handleSort("salesName")}
                  style={{ cursor: "pointer" }}
                >
                  Sales {getSortIndicator("salesName")}
                  {hasSalesFilter && (
                    <span className="filter-indicator filter-icon"></span>
                  )}
                </th>
                <th className="text-center">Quote Ref</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0); // Set time to midnight for accurate date comparison

                // Safely handle hold and overdue dates
                const holdDate = quote.hold ? new Date(quote.hold) : null;
                const overdueDate = quote.overdue
                  ? new Date(quote.overdue)
                  : null;

                // Only apply styling if dates are valid
                const rowClass =
                  holdDate && currentDate > holdDate
                    ? "table-danger"
                    : overdueDate && currentDate > overdueDate
                    ? "table-warning"
                    : "";

                return (
                  <tr key={quote.id} className={rowClass}>
                    <td
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/dashboard/quotes/edit/${quote.id}`)
                      }
                    >
                      {quote.id}
                    </td>
                    <td>{quote.quoteDate}</td>
                    <td
                      className="client-cell"
                      onClick={(e) => handleClientClick(quote.clientId, e)}
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
                      {formatPeso(quote.grandTotal)}
                    </td>
                    <td
                      className="client-cell"
                      onClick={(e) => {
                        if (salesFilterRef.current) {
                          salesFilterRef.current.toggleFilterMenu(e);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {quote.salesName}
                    </td>
                    <td>{quote.refId}</td>
                  </tr>
                );
              })}
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

      <ViewCustomerInfo
        clientId={selectedClientId}
        show={showClientInfo}
        onClose={() => setShowClientInfo(false)}
      />
    </div>
  );
}

export default Quotes;
