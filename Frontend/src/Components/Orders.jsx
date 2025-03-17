import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import { formatPeso } from "../utils/orderUtils";
//import "./Orders.css";
import StatusBadges from "./UI/StatusBadges";
import ModalAlert from "./UI/ModalAlert";
import axios from "../utils/axiosConfig"; // Import configured axios

function Orders() {
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
    const saved = localStorage.getItem("ordersSortConfig");
    return saved
      ? JSON.parse(saved)
      : {
          key: "id",
          direction: "desc",
        };
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
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
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const fetchOrders = async () => {
    setLoading(true);
    console.log(
      "FETCH",
      currentPage,
      recordsPerPage,
      sortConfig,
      sortConfig.direction,
      searchTerm,
      selectedSales,
      selectedClients
    );
    try {
      const token = localStorage.getItem("token");
      const activeStatuses = JSON.parse(
        localStorage.getItem("orderStatusFilter") || "[]"
      );
      console.log("Fetching with statuses:", activeStatuses);

      const response = await axios.get(`${ServerIP}/auth/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: recordsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
          search: searchTerm,
          statuses: activeStatuses.join(","),
          sales: selectedSales.length ? selectedSales.join(",") : undefined,
          clients: selectedClients.length
            ? selectedClients.join(",")
            : undefined,
        },
      });
      console.log("fetchOrders:", response.data.Result.orders);

      if (response.data.Status) {
        setOrders(response.data.Result.orders);
        setTotalCount(response.data.Result.total);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to fetch orders",
          type: "alert",
        });
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to fetch orders",
        type: "alert",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders when parameters change
  useEffect(() => {
    fetchOrders();
  }, [
    currentPage,
    recordsPerPage,
    sortConfig,
    searchTerm,
    selectedSales,
    selectedClients,
  ]);

  // Fetch status options
  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/order-statuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          const sortedStatuses = response.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);
        }
      } catch (err) {
        console.error("Error fetching status options:", err);
      }
    };

    fetchStatusOptions();
  }, []);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          setClientList(response.data.Result);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);

  // Fetch sales employees
  useEffect(() => {
    const fetchSalesEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/sales_employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          setSalesEmployees(response.data.Result);
          // Remove initial selection of all sales employees
        }
      } catch (err) {
        console.error("Error fetching sales employees:", err);
      }
    };
    fetchSalesEmployees();
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
    localStorage.setItem("ordersSortConfig", JSON.stringify(newSortConfig));
  };

  // Handle status changes from StatusBadges
  const handleStatusChange = (newActiveStatuses) => {
    console.log("Orders received new statuses:", newActiveStatuses);
    // Get the latest statuses from localStorage before fetching
    const savedStatuses = JSON.parse(
      localStorage.getItem("orderStatusFilter") || "[]"
    );
    console.log("Saved statuses:", savedStatuses);
    fetchOrders();
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
    const selectedProdStatuses = JSON.parse(
      localStorage.getItem("orderStatusFilter") || "[]"
    ).filter((s) => prodStatuses.includes(s));
    return (
      selectedProdStatuses.length > 0 &&
      selectedProdStatuses.length < prodStatuses.length
    );
  };

  const handleProdCheckbox = (e) => {
    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    let newStatuses;
    if (e.target.checked) {
      newStatuses = [
        ...new Set([
          ...JSON.parse(localStorage.getItem("orderStatusFilter") || "[]"),
          ...prodStatuses,
        ]),
      ];
    } else {
      newStatuses = JSON.parse(
        localStorage.getItem("orderStatusFilter") || "[]"
      ).filter((s) => !prodStatuses.includes(s));
    }

    localStorage.setItem("orderStatusFilter", JSON.stringify(newStatuses));
    setIsProdChecked(e.target.checked);
    setIsAllChecked(newStatuses.length === statusOptions.length);
  };

  const isAllIndeterminate = () => {
    return (
      JSON.parse(localStorage.getItem("orderStatusFilter") || "[]").length >
        0 &&
      JSON.parse(localStorage.getItem("orderStatusFilter") || "[]").length <
        statusOptions.length
    );
  };

  const handleAllCheckbox = (e) => {
    let newStatuses = [];
    if (e.target.checked) {
      newStatuses = statusOptions.map((s) => s.statusId);
    }
    localStorage.setItem("orderStatusFilter", JSON.stringify(newStatuses));
    setIsAllChecked(e.target.checked);
    setIsProdChecked(e.target.checked);
  };

  return (
    <div className="orders-theme">
      <div className="px-5 orders-page-background">
        <div className="d-flex justify-content-center pt-4">
          <h3>Orders List</h3>
        </div>

        {/* Search and filters row */}
        <div className="d-flex justify-content-between mb-3">
          <Button
            variant="add"
            onClick={() => navigate("/dashboard/orders/add")}
          >
            Add Order
          </Button>
          <div className="search-container">
            <label htmlFor="orderSearch" className="visually-hidden">
              Search orders
            </label>
            <input
              id="orderSearch"
              name="orderSearch"
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by ID, client, project, ordered by, DR#, INV#, OR#, sales, amount, ref..."
              onChange={handleSearch}
              style={{ width: "400px" }}
              aria-label="Search orders"
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
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                  role="columnheader"
                  aria-sort={
                    sortConfig.key === "id" ? sortConfig.direction : "none"
                  }
                >
                  Order ID {getSortIndicator("id")}
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
                {/* <th>Order Date</th> */}
                <th className="text-center">Due Date</th>
                <th className="text-center">Due Time</th>
                <th
                  className="text-center"
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status {getSortIndicator("status")}
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("drnum")}
                  style={{ cursor: "pointer" }}
                >
                  DR# {getSortIndicator("drnum")}
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("invnum")}
                  style={{ cursor: "pointer" }}
                >
                  INV# {getSortIndicator("invnum")}
                </th>
                <th className="text-center">Grand Total</th>
                <th
                  className="text-center"
                  onClick={() => handleSort("ornum")}
                  style={{ cursor: "pointer" }}
                >
                  OR# {getSortIndicator("ornum")}
                </th>
                <th className="text-center">Amount Paid</th>
                <th className="text-center">Date Paid</th>
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
                <th className="text-center">Order Ref</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
                      <Button
                        variant="edit"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/orders/edit/${order.id}`)
                        }
                      />
                    </div>
                  </td>
                  <td>
                    {order.id}
                    {order.revision > 0 && `-${order.revision}`}
                  </td>
                  <td
                    className="client-cell"
                    onClick={(e) => {
                      if (clientFilterRef.current) {
                        clientFilterRef.current.toggleFilterMenu(e);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div>{order.clientName}</div>
                    {order.customerName && (
                      <div className="small text-muted">
                        {order.customerName}
                      </div>
                    )}
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
                  <td className="text-center">
                    <span className={`status-badge ${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.drnum || ""}</td>
                  <td>{order.invnum || ""}</td>
                  <td className="number_right">
                    {order.grandTotal ? formatPeso(order.grandTotal) : ""}
                  </td>
                  <td>{order.ornum || ""}</td>
                  <td>
                    {order.amountPaid ? formatPeso(order.amountPaid) : ""}
                  </td>
                  <td>
                    {order.datePaid
                      ? new Date(order.datePaid).toLocaleDateString()
                      : ""}
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
            selectProps={{
              id: "ordersPerPage",
              name: "ordersPerPage",
              "aria-label": "Number of orders per page",
            }}
          />

          <StatusBadges
            statusOptions={statusOptions}
            onStatusChange={handleStatusChange}
            showProdFilter={true}
            isDisabled={false}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>

        <ModalAlert
          show={alert.show}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
          onConfirm={() => {
            if (alert.onConfirm) {
              alert.onConfirm();
            }
            setAlert((prev) => ({ ...prev, show: false }));
          }}
        />
      </div>
    </div>
  );
}

export default Orders;
