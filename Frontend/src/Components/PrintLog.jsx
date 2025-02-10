import axios from "../utils/axiosConfig";
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
import "./Orders.css";
import "./PrintLog.css";

function Prod() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
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
          key: "id",
          direction: "desc",
        };
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    const saved = localStorage.getItem("orderStatusFilters");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSales, setSelectedSales] = useState([]);
  const [isProdChecked, setIsProdChecked] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [hasClientFilter, setHasClientFilter] = useState(false);
  const [hasSalesFilter, setHasSalesFilter] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const salesFilterRef = useRef(null);
  const clientFilterRef = useRef(null);

  const fetchOrders = async () => {
    if (selectedStatuses.length === 0) {
      setOrders([]);
      setTotalCount(0);
      return;
    }
    console.log("FETCHING");
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

      const response = await axios.get(`${ServerIP}/auth/orders`, { params });
      if (response.data.Status) {
        setOrders(response.data.Result.orders);
        setTotalCount(response.data.Result.total);
        setTotalPages(Math.ceil(response.data.Result.total / recordsPerPage));
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
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

          // Set initial prod statuses
          const prodStatuses = sortedStatuses
            .slice(2, 6)
            .map((s) => s.statusId);
          setSelectedStatuses(prodStatuses);
          setIsProdChecked(true);
          localStorage.setItem(
            "orderStatusFilters",
            JSON.stringify(prodStatuses)
          );
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
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(fetchOrders, searchTerm ? 500 : 0);
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
    localStorage.setItem("printLogSortConfig", JSON.stringify(newSortConfig));
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
      console.log("New statuses after toggle:", newStatuses); // Debugging log
      // Update Prod checkbox state
      const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
      const selectedProdStatuses = newStatuses.filter((s) =>
        prodStatuses.includes(s)
      );
      console.log("Prod statuses:", prodStatuses); // Debugging log
      console.log("Selected prod statuses:", selectedProdStatuses); // Debugging log
      setIsProdChecked(selectedProdStatuses.length === prodStatuses.length);

      // Update All checkbox state
      setIsAllChecked(newStatuses.length === statusOptions.length);

      // Save to localStorage
      localStorage.setItem("orderStatusFilters", JSON.stringify(newStatuses));
      return newStatuses;
    });
    setCurrentPage(1);
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

  // Modify the page change handler
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    localStorage.setItem("ordersListPage", pageNumber.toString());
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

  const handleProdCheckbox = (e) => {
    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    let newStatuses;
    if (e.target.checked) {
      newStatuses = [...new Set([...selectedStatuses, ...prodStatuses])];
    } else {
      newStatuses = selectedStatuses.filter((s) => !prodStatuses.includes(s));
    }

    setSelectedStatuses(newStatuses);
    setIsProdChecked(e.target.checked);
    setIsAllChecked(newStatuses.length === statusOptions.length);

    // Save to localStorage
    localStorage.setItem("orderStatusFilters", JSON.stringify(newStatuses));
  };

  const isAllIndeterminate = () => {
    return (
      selectedStatuses.length > 0 &&
      selectedStatuses.length < statusOptions.length
    );
  };

  const handleAllCheckbox = (e) => {
    let newStatuses = [];
    if (e.target.checked) {
      newStatuses = statusOptions.map((s) => s.statusId);
    }
    setSelectedStatuses(newStatuses);
    setIsAllChecked(e.target.checked);
    setIsProdChecked(e.target.checked);

    // Save to localStorage
    localStorage.setItem("orderStatusFilters", JSON.stringify(newStatuses));
  };

  // Add a cleanup effect to save the page when unmounting
  useEffect(() => {
    return () => {
      localStorage.setItem("ordersListPage", currentPage.toString());
    };
  }, [currentPage]);

  return (
    <div className="printlog">
      <div className="printlog-page-background px-5">
        <div className="printlog-header d-flex justify-content-center">
          <h3>Print Log</h3>
        </div>
        {/* Search and filters row */}
        <div className="d-flex justify-content-between mb-3">
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
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                >
                  Order ID {getSortIndicator("id")}
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
                {/* <th>Order Date</th> */}
                <th>Due Date</th>
                <th>Due Time</th>
                <th
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status {getSortIndicator("status")}
                </th>
                <th
                  onClick={() => handleSort("drnum")}
                  style={{ cursor: "pointer" }}
                >
                  DR# {getSortIndicator("drnum")}
                </th>
                <th
                  onClick={() => handleSort("invnum")}
                  style={{ cursor: "pointer" }}
                >
                  INV# {getSortIndicator("invnum")}
                </th>
                <th>Grand Total</th>
                <th
                  onClick={() => handleSort("ornum")}
                  style={{ cursor: "pointer" }}
                >
                  OR# {getSortIndicator("ornum")}
                </th>
                <th>Amount Paid</th>
                <th>Date Paid</th>
                <th
                  onClick={() => handleSort("salesName")}
                  style={{
                    cursor: "pointer",
                    color: hasSalesFilter ? "#0d6efd" : "inherit",
                  }}
                >
                  Sales {getSortIndicator("salesName")}
                </th>
                <th>Order Ref</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
                      <Button
                        variant="view"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/printlog/view/${order.id}`)
                        }
                      />
                      {/* <Button
                        variant="edit"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/orders/edit/${order.id}`)
                        }
                      /> */}
                    </div>
                  </td>
                  <td>{order.id}</td>
                  <td
                    className="client-cell"
                    onClick={(e) => {
                      if (clientFilterRef.current) {
                        clientFilterRef.current.toggleFilterMenu(e);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {order.clientName}
                  </td>
                  <td>{order.projectName}</td>
                  <td>{order.orderedBy}</td>
                  {/* <td>
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString()
                      : ""}
                  </td> */}
                  <td>
                    {order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString()
                      : ""}
                  </td>
                  <td>{order.dueTime || ""}</td>
                  <td>
                    <span className={`status-badge ${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.drnum || ""}</td>
                  <td>{order.invnum || ""}</td>
                  <td>
                    {order.grandTotal
                      ? `₱${order.grandTotal.toLocaleString()}`
                      : ""}
                  </td>
                  <td>{order.ornum || ""}</td>
                  <td>
                    {order.amountPaid
                      ? `₱${order.amountPaid.toLocaleString()}`
                      : ""}
                  </td>
                  <td>
                    {order.datePaid
                      ? new Date(order.datePaid).toLocaleDateString()
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
                    {order.salesName}
                  </td>
                  <td>{order.orderReference}</td>
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

          <StatusBadges
            statusOptions={statusOptions}
            selectedStatuses={selectedStatuses}
            onStatusChange={(newStatuses) => {
              setSelectedStatuses(newStatuses);
              localStorage.setItem(
                "orderStatusFilters",
                JSON.stringify(newStatuses)
              );
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

export default Prod;
