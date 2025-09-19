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

function PrintLog() {
  const navigate = useNavigate();
  const [detailRows, setDetailRows] = useState([]);
  const [machineSummary, setMachineSummary] = useState([]);
  const [machineOptions, setMachineOptions] = useState(["All"]);
  const [selectedMachineType, setSelectedMachineType] = useState("All");
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
        : ["Prod", "Finish", "Finished", "Delivered"];

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
        `${ServerIP}/auth/print-hours/machine-types`
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
                ["Prod", "Finish", "Finished", "Delivered"].includes(
                  status.statusId
                )
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
            <div className="row g-3">
              {machineSummary.map((stat, index) => (
                <div
                  className="col-12 col-sm-6 col-md-4 col-lg-3"
                  key={stat.machineType}
                >
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
                  <tr key={detail.detailId}>
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
                      <strong>{formatNumber(detail.quantity)}</strong>
                    </td>
                    <td className="text-end">{formatNumber(detail.width)}</td>
                    <td className="text-end">{formatNumber(detail.height)}</td>
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
                      {formatNumber(detail.printHrs)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="text-center text-muted py-3">
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
