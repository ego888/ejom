import axios from "../utils/axiosConfig";
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import StatusBadges from "./UI/StatusBadges";
import "./Orders.css";
import "./PrintLog.css";
import "./Dashboard.css";
import { formatNumber } from "../utils/orderUtils";

const DEFAULT_PRINTLOG_STATUSES = ["Open", "Printed", "Prod"];

function PrintLog() {
  const navigate = useNavigate();
  const [detailRows, setDetailRows] = useState([]);
  const [machineSummary, setMachineSummary] = useState([]);
  const [machineOptions, setMachineOptions] = useState(["All"]);
  const [selectedMachineType, setSelectedMachineType] = useState("All");
  const [includeZeroQty, setIncludeZeroQty] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem("ordersListPage")) || 1;
  });
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem("printLogSortConfig");
    return saved
      ? JSON.parse(saved)
      : {
          key: "orderID",
          direction: "desc",
        };
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem("orderStatusFilter");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn("Error reading status filters:", error);
      return [];
    }
  });
  const [selectedSales, setSelectedSales] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [hasClientFilter, setHasClientFilter] = useState(false);
  const [hasSalesFilter, setHasSalesFilter] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const [logInputs, setLogInputs] = useState({});
  const [logErrors, setLogErrors] = useState({});
  const [logLoading, setLogLoading] = useState({});
  const [logHistory, setLogHistory] = useState({});
  const [logHistoryLoading, setLogHistoryLoading] = useState({});
  const [logHistoryError, setLogHistoryError] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const salesFilterRef = useRef(null);
  const clientFilterRef = useRef(null);
  const machineTypeColors = useMemo(
    () => [
      "Prod",
      "Finished",
      "Delivered",
      "Billed",
      "Printed",
      "Open",
      "default",
    ],
    []
  );

  const fetchPrintLogData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const statusFilter = selectedStatuses.length
        ? selectedStatuses
        : DEFAULT_PRINTLOG_STATUSES;

      const response = await axios.get(`${ServerIP}/auth/printlog/details`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: recordsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
          search: searchTerm,
          statuses: statusFilter.join(","),
          sales: selectedSales.length ? selectedSales.join(",") : undefined,
          clients: selectedClients.length
            ? selectedClients.join(",")
            : undefined,
          machineType:
            selectedMachineType && selectedMachineType !== "All"
              ? selectedMachineType
              : undefined,
          includeZeroQty: includeZeroQty ? 1 : 0,
        },
      });

      if (response.data.Status) {
        const result = response.data.Result || {};
        const rows = result.data || [];
        const total = result.totalCount || 0;

        setDetailRows(rows);
        setTotalCount(total);
        setTotalPages(Math.ceil(total / recordsPerPage));
      } else {
        setDetailRows([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching print log details:", error);
      setDetailRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      fetchMachineSummary();
    }
  };

  const fetchMachineSummary = async () => {
    try {
      const response = await axios.get(
        `${ServerIP}/auth/print-hours/machine-types`,
        {
          params: {
            includeZeroQty: includeZeroQty ? 1 : 0,
          },
        }
      );
      if (response.data.Status) {
        const summary = response.data.Result || [];
        setMachineSummary(summary);
        const options = [
          "All",
          ...summary
            .map((item) => item.machineType)
            .filter((value, index, self) => self.indexOf(value) === index),
        ];
        setMachineOptions(options);
        if (
          selectedMachineType !== "All" &&
          !options.includes(selectedMachineType)
        ) {
          setSelectedMachineType("All");
        }
      } else {
        setMachineSummary([]);
        setMachineOptions(["All"]);
        setSelectedMachineType("All");
      }
    } catch (error) {
      console.error("Error fetching machine summary:", error);
      setMachineSummary([]);
      setMachineOptions(["All"]);
      setSelectedMachineType("All");
    }
  };

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Fetch all initial data in parallel
        const [statusResponse, clientResponse, salesResponse] =
          await Promise.all([
            axios.get(`${ServerIP}/auth/order-statuses`),
            axios.get(`${ServerIP}/auth/clients`),
            axios.get(`${ServerIP}/auth/sales_employees`),
          ]);

        // Handle status options and initial filters
        if (statusResponse.data.Status) {
          const sortedStatuses = statusResponse.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);

          // Set default production statuses if none are stored
          const savedStatuses = (() => {
            try {
              return JSON.parse(
                localStorage.getItem("orderStatusFilter") || "[]"
              );
            } catch (error) {
              console.warn("Error parsing saved statuses:", error);
              return [];
            }
          })();

          if (!savedStatuses.length) {
            const defaultStatuses = sortedStatuses
              .filter((status) =>
                DEFAULT_PRINTLOG_STATUSES.includes(status.statusId)
              )
              .map((status) => status.statusId);

            setSelectedStatuses(defaultStatuses);
            localStorage.setItem(
              "orderStatusFilter",
              JSON.stringify(defaultStatuses)
            );
          } else {
            setSelectedStatuses(savedStatuses);
          }
        }

        // Handle other responses
        if (clientResponse.data.Status)
          setClientList(clientResponse.data.Result);
        if (salesResponse.data.Status)
          setSalesEmployees(salesResponse.data.Result);
      } catch (error) {
        console.error("Error in initialization:", error);
      }
    };

    initializeComponent();
    fetchMachineSummary();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(fetchPrintLogData, searchTerm ? 500 : 0);
    return () => clearTimeout(timeoutId);
  }, [
    selectedStatuses,
    currentPage,
    recordsPerPage,
    sortConfig,
    searchTerm,
    selectedSales,
    selectedClients,
    selectedMachineType,
    includeZeroQty,
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
    localStorage.setItem("printLogSortConfig", JSON.stringify(newSortConfig));
  };

  const handleLogQtyChange = (detailId, value) => {
    setLogInputs((prev) => ({ ...prev, [detailId]: value }));
    setLogErrors((prev) => {
      if (!prev[detailId]) return prev;
      const next = { ...prev };
      delete next[detailId];
      return next;
    });
  };

  const fetchLogHistory = async (detailId) => {
    setLogHistoryLoading((prev) => ({ ...prev, [detailId]: true }));
    setLogHistoryError((prev) => {
      if (!prev[detailId]) return prev;
      const next = { ...prev };
      delete next[detailId];
      return next;
    });

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/printlog/details/${detailId}/logs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.Status) {
        throw new Error(response.data.Error || "Failed to load logs.");
      }

      const logs = Array.isArray(response.data.Result)
        ? response.data.Result
        : [];

      setLogHistory((prev) => ({ ...prev, [detailId]: logs }));
    } catch (error) {
      console.error("Error fetching print logs:", error);
      const message =
        error.response?.data?.Error || error.message || "Failed to load logs.";
      setLogHistoryError((prev) => ({ ...prev, [detailId]: message }));
    } finally {
      setLogHistoryLoading((prev) => ({ ...prev, [detailId]: false }));
    }
  };

  const handleLogSubmit = async (detailId) => {
    const inputValue = logInputs[detailId];
    const numericValue = parseFloat(inputValue);

    if (!inputValue || !Number.isFinite(numericValue) || numericValue <= 0) {
      setLogErrors((prev) => ({
        ...prev,
        [detailId]: "Enter a positive number.",
      }));
      return;
    }

    try {
      setLogLoading((prev) => ({ ...prev, [detailId]: true }));
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${ServerIP}/auth/printlog/details/${detailId}/log`,
        { printedQty: numericValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.Status) {
        throw new Error(response.data.Error || "Failed to log quantity.");
      }

      const result = response.data.Result || {};

      setDetailRows((prevRows) =>
        prevRows.map((row) => {
          if (row.detailId !== detailId) return row;

          const nextPrintedQty =
            typeof result.printedQty === "number"
              ? result.printedQty
              : (row.printedQty || 0) + numericValue;

          const totalQty = row.quantity || 0;
          const plannedPrintHrs = row.printHrs || 0;

          const nextRemainingQty =
            typeof result.remainingQty === "number"
              ? result.remainingQty
              : Math.max(totalQty - nextPrintedQty, 0);

          let nextPrintedHrs;
          if (typeof result.printedHrs === "number") {
            nextPrintedHrs = result.printedHrs;
          } else if (totalQty > 0) {
            nextPrintedHrs = (nextPrintedQty / totalQty) * plannedPrintHrs;
          } else {
            nextPrintedHrs = 0;
          }

          const nextRemainingPrintHrs =
            typeof result.remainingPrintHrs === "number"
              ? result.remainingPrintHrs
              : Math.max(plannedPrintHrs - nextPrintedHrs, 0);

          return {
            ...row,
            printedQty: nextPrintedQty,
            remainingQty: nextRemainingQty,
            printedHrs: nextPrintedHrs,
            remainingPrintHrs: nextRemainingPrintHrs,
          };
        })
      );

      fetchMachineSummary();

      if (result.logEntry) {
        setLogHistory((prev) => {
          const existing = prev[detailId] || [];
          return {
            ...prev,
            [detailId]: [
              {
                ...result.logEntry,
              },
              ...existing,
            ],
          };
        });
      } else if (expandedRows[detailId]) {
        // Ensure history stays up-to-date
        fetchLogHistory(detailId);
      }

      setLogInputs((prev) => ({ ...prev, [detailId]: "" }));
      setLogErrors((prev) => {
        if (!prev[detailId]) return prev;
        const next = { ...prev };
        delete next[detailId];
        return next;
      });
    } catch (error) {
      console.error("Error logging quantity:", error);
      const remaining = error.response?.data?.Result?.remaining;
      const remainingMessage =
        typeof remaining === "number"
          ? ` Remaining Qty: ${formatNumber(remaining)}`
          : "";
      const errorMessage =
        error.response?.data?.Error ||
        error.message ||
        "Failed to log quantity.";
      setLogErrors((prev) => ({
        ...prev,
        [detailId]: `${errorMessage}${remainingMessage}`,
      }));
    } finally {
      setLogLoading((prev) => ({ ...prev, [detailId]: false }));
    }
  };

  const handleToggleLogHistory = async (detailId) => {
    const isExpanded = !!expandedRows[detailId];
    if (isExpanded) {
      setExpandedRows((prev) => ({ ...prev, [detailId]: false }));
      return;
    }

    setExpandedRows((prev) => ({ ...prev, [detailId]: true }));

    if (!logHistory[detailId]) {
      await fetchLogHistory(detailId);
    }
  };

  const formatLogDate = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  // Status filter handlers
  // const handleStatusFilter = (statusId) => {
  //   setSelectedStatuses((prev) => {
  //     let newStatuses;
  //     if (prev.includes(statusId)) {
  //       newStatuses = prev.filter((s) => s !== statusId);
  //     } else {
  //       newStatuses = [...prev, statusId];
  //     }
  //     // Update Prod checkbox state
  //     const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
  //     const selectedProdStatuses = newStatuses.filter((s) =>
  //       prodStatuses.includes(s)
  //     );
  //     setIsProdChecked(selectedProdStatuses.length === prodStatuses.length);

  //     // Update All checkbox state
  //     setIsAllChecked(newStatuses.length === statusOptions.length);

  //     // Save to localStorage
  //     return newStatuses;
  //   });
  //   setCurrentPage(1);
  // };

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

  // Modify the page change handler
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    localStorage.setItem("ordersListPage", pageNumber.toString());
  };

  // Handle records per page change
  // const handleRecordsPerPageChange = (e) => {
  //   setRecordsPerPage(Number(e.target.value));
  //   setCurrentPage(1); // Reset to first page
  // };

  return (
    <div className="printlog">
      <div className="printlog-page-background px-5">
        <div className="printlog-header d-flex justify-content-center">
          <h3>Print Log</h3>
        </div>
        <div className="dashboard-section h-100 p-3 mb-4">
          <h4 className="section-title mb-3">Print Hours by Machine Type</h4>
          {machineSummary.length ? (
            <div className="row g-3 row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5">
              {machineSummary.map((stat, index) => (
                <div className="col" key={stat.machineType}>
                  <div
                    className={`dashboard-card status-badge ${
                      machineTypeColors[index % machineTypeColors.length]
                    }`}
                  >
                    <div className="card-label">{stat.machineType}</div>
                    <div className="card-value">
                      {formatNumber(stat.totalPrintHours)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">No production print hours found.</div>
          )}
        </div>
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
          <input
            id="search-input"
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by JO #, client, project, material..."
            onChange={handleSearch}
            style={{ width: "400px" }}
          />
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="checkbox"
              id="include-zero-qty"
              checked={includeZeroQty}
              onChange={(e) => {
                setIncludeZeroQty(e.target.checked);
                setCurrentPage(1);
                localStorage.setItem("ordersListPage", "1");
              }}
            />
            <label className="form-check-label" htmlFor="include-zero-qty">
              Include zero qty
            </label>
          </div>
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: "220px" }}
            value={selectedMachineType}
            onChange={(e) => {
              setSelectedMachineType(e.target.value);
              setCurrentPage(1);
            }}
          >
            {machineOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="table-responsive mb-4">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("machineType")}
                >
                  Machine Type {getSortIndicator("machineType")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("orderID")}
                >
                  JO # {getSortIndicator("orderID")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("clientName")}
                >
                  Client {getSortIndicator("clientName")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("projectName")}
                >
                  Project Name {getSortIndicator("projectName")}
                </th>
                <th
                  className="text-end"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("quantity")}
                >
                  Qty {getSortIndicator("quantity")}
                </th>
                <th className="text-center">Log Qty</th>
                <th
                  className="text-end"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("width")}
                >
                  Width {getSortIndicator("width")}
                </th>
                <th
                  className="text-end"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("height")}
                >
                  Height {getSortIndicator("height")}
                </th>
                <th>Unit</th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("material")}
                >
                  Material {getSortIndicator("material")}
                </th>
                <th className="text-center">Top</th>
                <th className="text-center">Bottom</th>
                <th className="text-center">Left</th>
                <th className="text-center">Right</th>
                <th
                  className="text-end"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("printHrs")}
                >
                  Print Hrs {getSortIndicator("printHrs")}
                </th>
              </tr>
            </thead>
            <tbody>
              {detailRows.length ? (
                detailRows.map((detail) => (
                  <React.Fragment key={detail.detailId}>
                    <tr>
                      <td>{detail.machineType}</td>
                      <td
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate(`/dashboard/printlog/view/${detail.orderId}`)
                        }
                      >
                        {detail.orderId}
                        {detail.revision > 0 && `-${detail.revision}`}
                      </td>
                      <td>
                        <div>{detail.clientName}</div>
                        {detail.customerName && (
                          <div className="small text-muted">
                            {detail.customerName}
                          </div>
                        )}
                      </td>
                      <td>{detail.projectName}</td>
                      <td className="text-end">
                        <div>
                          <strong>{formatNumber(detail.remainingQty)}</strong>
                        </div>
                        <div className="small text-muted">
                          Orig Qty: {formatNumber(detail.quantity)}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={logInputs[detail.detailId] ?? ""}
                              onChange={(e) =>
                                handleLogQtyChange(
                                  detail.detailId,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleLogSubmit(detail.detailId);
                                }
                              }}
                              placeholder="Qty"
                              aria-label="Log printed quantity"
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleLogSubmit(detail.detailId)}
                              disabled={logLoading[detail.detailId]}
                            >
                              {logLoading[detail.detailId]
                                ? "Saving..."
                                : "Log"}
                            </button>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <button
                              type="button"
                              className="btn btn-link btn-sm px-0"
                              onClick={() =>
                                handleToggleLogHistory(detail.detailId)
                              }
                            >
                              {expandedRows[detail.detailId]
                                ? "Hide Log"
                                : "View Log"}
                            </button>
                          </div>
                          {logErrors[detail.detailId] && (
                            <div className="small text-danger">
                              {logErrors[detail.detailId]}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-end">{formatNumber(detail.width)}</td>
                      <td className="text-end">
                        {formatNumber(detail.height)}
                      </td>
                      <td>{detail.unit}</td>
                      <td>{detail.material}</td>
                      <td className="text-center">
                        {detail.top > 0 ? detail.top : ""}
                      </td>
                      <td className="text-center">
                        {detail.bottom > 0 ? detail.bottom : ""}
                      </td>
                      <td className="text-center">
                        {detail.allowanceLeft > 0 ? detail.allowanceLeft : ""}
                      </td>
                      <td className="text-center">
                        {detail.allowanceRight > 0 ? detail.allowanceRight : ""}
                      </td>
                      <td className="text-end">
                        <div>
                          <strong>
                            {formatNumber(detail.remainingPrintHrs)}
                          </strong>
                        </div>
                        <div className="small text-muted">
                          Printed: {formatNumber(detail.printedHrs)}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[detail.detailId] && (
                      <tr className="printlog-history-row">
                        <td colSpan={15}>
                          <div className="bg-light border rounded p-3">
                            {logHistoryLoading[detail.detailId] ? (
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                >
                                  <span className="visually-hidden">
                                    Loading...
                                  </span>
                                </div>
                                <span>Loading log...</span>
                              </div>
                            ) : logHistoryError[detail.detailId] ? (
                              <div className="text-danger small">
                                {logHistoryError[detail.detailId]}
                              </div>
                            ) : logHistory[detail.detailId]?.length ? (
                              <div className="table-responsive">
                                <table className="table table-sm mb-0">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "140px" }}>
                                        Printed Qty
                                      </th>
                                      <th>Employee</th>
                                      <th style={{ width: "220px" }}>
                                        Logged At
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {logHistory[detail.detailId].map((log) => (
                                      <tr key={log.id}>
                                        <td>{formatNumber(log.printedQty)}</td>
                                        <td>{log.employeeName || ""}</td>
                                        <td>{formatLogDate(log.logDate)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-muted small">
                                No log entries yet.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="text-center text-muted py-3">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        <div className="d-flex flex-wrap gap-3 mb-3">
          <div className={hasSalesFilter ? "active-filter" : ""}>
            <SalesFilter
              ref={salesFilterRef}
              salesEmployees={salesEmployees}
              selectedSales={selectedSales}
              setSelectedSales={(values) => {
                setSelectedSales(values);
                setCurrentPage(1);
              }}
              onFilterUpdate={({ isFilterActive }) =>
                setHasSalesFilter(isFilterActive)
              }
            />
          </div>
          <div className={hasClientFilter ? "active-filter" : ""}>
            <ClientFilter
              ref={clientFilterRef}
              clientList={clientList}
              selectedClients={selectedClients}
              setSelectedClients={(values) => {
                setSelectedClients(values);
                setCurrentPage(1);
              }}
              onFilterUpdate={({ isFilterActive }) =>
                setHasClientFilter(isFilterActive)
              }
            />
          </div>
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

          <StatusBadges
            statusOptions={statusOptions}
            selectedStatuses={selectedStatuses}
            onStatusChange={(newStatuses) => {
              setSelectedStatuses(newStatuses);
              localStorage.setItem(
                "orderStatusFilter",
                JSON.stringify(newStatuses)
              );
              setCurrentPage(1);
            }}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
}

export default PrintLog;
