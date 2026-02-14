import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import { formatPeso, formatDate } from "../utils/orderUtils";
import "./Orders.css";
import StatusBadges from "./UI/StatusBadges";
import ModalAlert from "./UI/ModalAlert";
import axios from "../utils/axiosConfig"; // Import configured axios
import ViewCustomerInfo from "./UI/ViewCustomerInfo";
import InvoiceDetailsModal from "./UI/InvoiceDetailsModal";

const ORDERS_CLIENT_FILTER_KEY = "ordersClientFilters";

const getSavedClientFilters = () => {
  const saved = localStorage.getItem(ORDERS_CLIENT_FILTER_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing saved client filters:", error);
    return [];
  }
};

function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = parseInt(localStorage.getItem("ordersListPage")) || 1;
    return savedPage;
  });
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem("ordersSortConfig");
    const defaultConfig = {
      key: "id",
      direction: "desc",
    };
    return saved ? JSON.parse(saved) : defaultConfig;
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    const saved = localStorage.getItem("ordersSearchTerm") || "";
    return saved;
  });
  const [displaySearchTerm, setDisplaySearchTerm] = useState(() => {
    const saved = localStorage.getItem("ordersSearchTerm") || "";
    return saved;
  });
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  // const [isProdChecked, setIsProdChecked] = useState(false);
  // const [isAllChecked, setIsAllChecked] = useState(false);
  const [selectedClients, setSelectedClients] = useState(() =>
    getSavedClientFilters()
  );
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
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const hoverTimerRef = useRef(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [clickTimer, setClickTimer] = useState(null);

  // Add useEffect to sync state with localStorage on mount
  useEffect(() => {
    const savedPage = parseInt(localStorage.getItem("ordersListPage")) || 1;
    const savedSort = localStorage.getItem("ordersSortConfig");
    const savedSearch = localStorage.getItem("ordersSearchTerm") || "";

    if (savedPage !== currentPage) {
      setCurrentPage(savedPage);
    }

    if (savedSort && JSON.parse(savedSort) !== sortConfig) {
      setSortConfig(JSON.parse(savedSort));
    }

    if (savedSearch !== searchTerm) {
      setSearchTerm(savedSearch);
      setDisplaySearchTerm(savedSearch);
    }

    const savedClientFilters = getSavedClientFilters();
    if (JSON.stringify(savedClientFilters) !== JSON.stringify(selectedClients)) {
      setSelectedClients(savedClientFilters);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      ORDERS_CLIENT_FILTER_KEY,
      JSON.stringify(selectedClients)
    );
  }, [selectedClients]);

  // Add useEffect to check navigation state
  useEffect(() => {
    if (location.state?.refresh) {
      fetchOrders();
      // Clear the refresh flag
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const activeStatuses = JSON.parse(
        localStorage.getItem("orderStatusFilter") || "[]"
      );

      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        statuses: activeStatuses.join(","),
        sales: selectedSales.length ? selectedSales.join(",") : undefined,
        clients: selectedClients.length ? selectedClients.join(",") : undefined,
      };
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get(`${ServerIP}/auth/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.Status) {
        const ordersData = response.data.Result.orders;
        const total = response.data.Result.total;
        const pages = response.data.Result.totalPages || 0;

        setOrders(ordersData);
        setTotalCount(total);
        setTotalPages(pages);

        // If filters/search leave the current page empty but results still exist, jump back to page 1.
        if (pages > 0 && ordersData.length === 0 && currentPage > 1) {
          setCurrentPage(1);
          localStorage.setItem("ordersListPage", "1");
        }
      } else {
        console.error("Error in orders response:", response.data.Error);
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
          const fetchedClients = response.data.Result;
          setClientList(fetchedClients);

          const validClientNames = new Set(
            fetchedClients.map((client) => client.clientName)
          );
          setSelectedClients((prev) =>
            prev.filter((clientName) => validClientNames.has(clientName))
          );
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
      localStorage.setItem("ordersSearchTerm", term);
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
    localStorage.setItem("ordersSortConfig", JSON.stringify(newSortConfig));
  };

  // Handle status changes from StatusBadges
  const handleStatusChange = (newActiveStatuses) => {
    // Get the latest statuses from localStorage before fetching
    const savedStatuses = JSON.parse(
      localStorage.getItem("orderStatusFilter") || "[]"
    );
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

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
      localStorage.setItem("ordersListPage", "1");
    }
  }, [totalPages, currentPage]);

  // Modify the page change handler
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    localStorage.setItem("ordersListPage", pageNumber.toString());
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
    <div className="orders-theme">
      <div className="px-5 orders-page-background">
        <div className="d-flex justify-content-center pt-4">
          <h3>Orders List</h3>
        </div>

        {/* Search and filters row */}
        <div className="orders-toolbar mb-3">
          <div className="orders-toolbar__primary">
            <Button
              variant="add"
              onClick={() => navigate("/dashboard/orders/add")}
            >
              Add Order
            </Button>
          </div>
          <div className="orders-search">
            <label htmlFor="orderSearch" className="visually-hidden">
              Search orders
            </label>
            <div className="orders-search__input-wrapper">
              <input
                id="orderSearch"
                name="orderSearch"
                type="text"
                className="form-control form-control-sm orders-search__input"
                placeholder="Search by ID, client, project, ordered by, DR#, INV#, OR#, sales, amount, ref..."
                onChange={handleSearch}
                value={displaySearchTerm}
                aria-label="Search orders"
              />
              {displaySearchTerm && (
                <button
                  type="button"
                  className="orders-search__clear"
                  onClick={() => {
                    setDisplaySearchTerm("");
                    setSearchTerm("");
                    localStorage.setItem("ordersSearchTerm", "");
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
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                  role="columnheader"
                  aria-sort={
                    sortConfig.key === "id" ? sortConfig.direction : "none"
                  }
                >
                  JO # {getSortIndicator("id")}
                </th>
                <th className="text-center">Order Date</th>
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
              {orders.map((order, index) => {
                const currentDate = new Date();
                const holdDate = new Date(order.holdDate);
                const warningDate = new Date(order.warningDate);

                const rowClass =
                  currentDate > holdDate && order.holdDate
                    ? "table-danger"
                    : currentDate > warningDate && order.warningDate
                    ? "table-warning"
                    : "";

                return (
                  <tr
                    key={order.id}
                    className={rowClass}
                    style={{
                      fontWeight:
                        new Date() > new Date(order.warningDate) &&
                        order.grandTotal > order.amountPaid &&
                        !(
                          order.status === "Closed" || order.status === "Cancel"
                        )
                          ? "bold"
                          : "normal",
                    }}
                  >
                    <td
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/dashboard/orders/edit/${order.id}`)
                      }
                    >
                      {order.id}
                      {order.revision > 0 && `-${order.revision}`}
                    </td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td
                      className="client-cell"
                      onClick={(e) => handleClientClick(order.clientId, e)}
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
                        ? formatDate(order.dueDate)
                        : ""}
                    </td>
                    <td>{order.dueTime || ""}</td>
                    <td className="text-center">
                      <span className={`status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.drnum || ""}</td>
                    <td
                      onClick={() => {
                        if (order.invnum) {
                          setSelectedOrderForDetails(order);
                          setShowInvoiceDetails(true);
                        }
                      }}
                      style={{ cursor: order.invnum ? "pointer" : "default" }}
                    >
                      {order.invnum || ""}
                    </td>
                    <td className="number_right">
                      {order.grandTotal ? formatPeso(order.grandTotal) : ""}
                    </td>
                    <td>{order.orNums || ""}</td>
                    <td className="number_right">
                      {Number(order.amountPaid) === 0
                        ? ""
                        : formatPeso(order.amountPaid)}
                    </td>
                    <td>
                      {order.datePaid ? formatDate(order.datePaid) : ""}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination and Filters Section */}
        <div className="orders-controls mt-3">
          <div className="orders-controls__section orders-controls__section--left">
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
          </div>

          <div className="orders-controls__section orders-controls__section--filters">
            <StatusBadges
              statusOptions={statusOptions}
              onStatusChange={handleStatusChange}
              showProdFilter={true}
              isDisabled={false}
            />
          </div>

          <div className="orders-controls__section orders-controls__section--right">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
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

        <ViewCustomerInfo
          clientId={selectedClientId}
          show={showClientInfo}
          onClose={() => setShowClientInfo(false)}
        />

        <InvoiceDetailsModal
          show={showInvoiceDetails}
          onClose={() => setShowInvoiceDetails(false)}
          orderId={selectedOrderForDetails?.id}
        />
      </div>
    </div>
  );
}

export default Orders;
