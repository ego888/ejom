import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import "./Orders.css";
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
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/orders`, {
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
    selectedStatuses,
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

          // Get saved filters or default to first two statuses
          const saved = localStorage.getItem("orderStatusFilters");
          if (saved) {
            const savedStatuses = JSON.parse(saved);
            setSelectedStatuses(savedStatuses);

            // Update Prod checkbox state
            const prodStatuses = sortedStatuses
              .slice(2, 6)
              .map((s) => s.statusId);
            const selectedProdStatuses = savedStatuses.filter((s) =>
              prodStatuses.includes(s)
            );
            setIsProdChecked(
              selectedProdStatuses.length === prodStatuses.length
            );

            // Update All checkbox state
            setIsAllChecked(savedStatuses.length === sortedStatuses.length);
          } else {
            // Default to first two statuses
            const firstTwoStatuses = sortedStatuses
              .slice(0, 2)
              .map((s) => s.statusId);
            setSelectedStatuses(firstTwoStatuses);
            localStorage.setItem(
              "orderStatusFilters",
              JSON.stringify(firstTwoStatuses)
            );
            setIsProdChecked(false);
            setIsAllChecked(false);
          }
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

  // Status filter handlers
  const handleStatusFilter = (statusId) => {
    setSelectedStatuses((prev) => {
      let newStatuses;
      if (prev.includes(statusId)) {
        newStatuses = prev.filter((s) => s !== statusId);
      } else {
        newStatuses = [...prev, statusId];
      }

      // Update Prod checkbox state
      const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
      const selectedProdStatuses = newStatuses.filter((s) =>
        prodStatuses.includes(s)
      );
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
    <div className="px-5 orders-page-background">
      <div className="d-flex justify-content-center pt-4">
        <h3>Orders List</h3>
      </div>

      {/* Search and filters row */}
      <div className="d-flex justify-content-between mb-3">
        <Button variant="add" onClick={() => navigate("/dashboard/orders/add")}>
          Add Order
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
                    {/* <Button
                      variant="view"
                      iconOnly
                      size="sm"
                      onClick={() =>
                        navigate(`/dashboard/view_order/${order.id}`)
                      }
                    /> */}
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
                <td className="number_right">
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
  );
}

export default Orders;
