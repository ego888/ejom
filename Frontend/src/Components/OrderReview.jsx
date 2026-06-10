import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import debounce from "lodash/debounce";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { ServerIP } from "../config";
import ClientFilter from "./Logic/ClientFilter";
import SalesFilter from "./Logic/SalesFilter";
import { formatDate, formatDateTime } from "../utils/orderUtils";
import "./Orders.css";
import "./OrderReview.css";
import StatusBadges from "./UI/StatusBadges";
import ModalAlert from "./UI/ModalAlert";
import axios from "../utils/axiosConfig";

const ORDER_REVIEW_CLIENT_FILTER_KEY = "orderReviewClientFilters";

const getSavedClientFilters = () => {
  const saved = localStorage.getItem(ORDER_REVIEW_CLIENT_FILTER_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing saved client filters:", error);
    return [];
  }
};

function OrderReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem("orderReviewListPage")) || 1;
  });
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem("orderReviewSortConfig");
    const defaultConfig = { key: "id", direction: "desc" };
    return saved ? JSON.parse(saved) : defaultConfig;
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem("orderReviewSearchTerm") || "";
  });
  const [displaySearchTerm, setDisplaySearchTerm] = useState(() => {
    return localStorage.getItem("orderReviewSearchTerm") || "";
  });
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
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

  useEffect(() => {
    localStorage.setItem(
      ORDER_REVIEW_CLIENT_FILTER_KEY,
      JSON.stringify(selectedClients)
    );
  }, [selectedClients]);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchOrders();
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

        if (pages > 0 && ordersData.length === 0 && currentPage > 1) {
          setCurrentPage(1);
          localStorage.setItem("orderReviewListPage", "1");
        }
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

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/order-statuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          setStatusOptions(
            response.data.Result.sort((a, b) => a.step - b.step)
          );
        }
      } catch (err) {
        console.error("Error fetching status options:", err);
      }
    };
    fetchStatusOptions();
  }, []);

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

  useEffect(() => {
    const fetchSalesEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/sales_employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          setSalesEmployees(response.data.Result);
        }
      } catch (err) {
        console.error("Error fetching sales employees:", err);
      }
    };
    fetchSalesEmployees();
  }, []);

  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
      localStorage.setItem("orderReviewSearchTerm", term);
    }, 500),
    []
  );

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setDisplaySearchTerm(term);
    debouncedSearch(term);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    setCurrentPage(1);
    localStorage.setItem("orderReviewSortConfig", JSON.stringify(newSortConfig));
  };

  const handleStatusChange = () => {
    fetchOrders();
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  useEffect(() => {
    setTotalPages(Math.ceil(totalCount / recordsPerPage));
  }, [totalCount, recordsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
      localStorage.setItem("orderReviewListPage", "1");
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    localStorage.setItem("orderReviewListPage", pageNumber.toString());
  };

  const clearClientFilter = (event) => {
    event.stopPropagation();
    setSelectedClients([]);
    setCurrentPage(1);
    localStorage.setItem("orderReviewListPage", "1");
  };

  const formatDateTimeCell = (value) => {
    if (!value) return "";
    return formatDateTime(value) || value;
  };

  return (
    <div className="order-review-theme orders-theme">
      <div className="px-3 px-md-5 order-review-page-background orders-page-background">
        <div className="d-flex justify-content-center pt-4">
          <h3>Order Review</h3>
        </div>

        <div className="order-review-toolbar orders-toolbar mb-3">
          <div className="order-review-search orders-search">
            <label htmlFor="orderReviewSearch" className="visually-hidden">
              Search orders
            </label>
            <div className="order-review-search__input-wrapper orders-search__input-wrapper">
              <input
                id="orderReviewSearch"
                name="orderReviewSearch"
                type="text"
                className="form-control form-control-sm orders-search__input"
                placeholder="Search by ID/client/project... (space = OR, +term = AND)"
                onChange={handleSearch}
                value={displaySearchTerm}
                aria-label="Search orders"
              />
              {displaySearchTerm && (
                <button
                  type="button"
                  className="order-review-search__clear orders-search__clear"
                  onClick={() => {
                    setDisplaySearchTerm("");
                    setSearchTerm("");
                    localStorage.setItem("orderReviewSearchTerm", "");
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        <div className="order-review-table-wrap table-responsive">
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
          <table className="table table-striped table-hover order-review-table">
            <thead>
              <tr>
                <th
                  className="text-center"
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                >
                  JO # {getSortIndicator("id")}
                </th>
                <th
                  className="text-center order-review-date-col"
                  onClick={() => handleSort("orderDate")}
                  style={{ cursor: "pointer" }}
                >
                  Order Date {getSortIndicator("orderDate")}
                </th>
                <th
                  className={`text-center ${
                    hasClientFilter ? "active-filter" : ""
                  }`}
                  onClick={() => handleSort("clientName")}
                  style={{ cursor: "pointer" }}
                >
                  <span className="filter-header">
                    <span>Client {getSortIndicator("clientName")}</span>
                    {hasClientFilter && (
                      <span className="filter-header__actions">
                        <span
                          className="filter-indicator filter-icon"
                          aria-hidden="true"
                        ></span>
                        <button
                          type="button"
                          className="filter-reset-button"
                          onClick={clearClientFilter}
                          aria-label="Clear client filter"
                          title="Clear client filter"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </span>
                </th>
                <th className="text-center">Project Name</th>
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
                <th
                  className="text-center"
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status {getSortIndicator("status")}
                </th>
                <th
                  className="text-center order-review-date-col"
                  onClick={() => handleSort("lastEdited")}
                  style={{ cursor: "pointer" }}
                >
                  Last Edited {getSortIndicator("lastEdited")}
                </th>
                <th
                  className="text-center order-review-date-col"
                  onClick={() => handleSort("productionDate")}
                  style={{ cursor: "pointer" }}
                >
                  Production {getSortIndicator("productionDate")}
                </th>
                <th
                  className="text-center order-review-date-col"
                  onClick={() => handleSort("readyDate")}
                  style={{ cursor: "pointer" }}
                >
                  Ready {getSortIndicator("readyDate")}
                </th>
                <th
                  className="text-center order-review-date-col"
                  onClick={() => handleSort("deliveryDate")}
                  style={{ cursor: "pointer" }}
                >
                  Delivery {getSortIndicator("deliveryDate")}
                </th>
                <th
                  className="text-center order-review-date-col"
                  onClick={() => handleSort("billDate")}
                  style={{ cursor: "pointer" }}
                >
                  Bill {getSortIndicator("billDate")}
                </th>
                <th className="text-center order-review-log-col">Log</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
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
                  <tr key={order.id} className={rowClass}>
                    <td
                      className="text-center"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/dashboard/orders/edit/${order.id}`)
                      }
                    >
                      {order.id}
                      {order.revision > 0 && `-${order.revision}`}
                    </td>
                    <td className="order-review-date-col text-center">
                      {formatDate(order.orderDate)}
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
                    <td
                      className="client-cell text-center"
                      onClick={(e) => {
                        if (salesFilterRef.current) {
                          salesFilterRef.current.toggleFilterMenu(e);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {order.salesName}
                    </td>
                    <td className="text-center">
                      <span className={`status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="order-review-date-col text-center">
                      {formatDateTimeCell(order.lastEdited)}
                    </td>
                    <td className="order-review-date-col text-center">
                      {formatDateTimeCell(order.productionDate)}
                    </td>
                    <td className="order-review-date-col text-center">
                      {formatDateTimeCell(order.readyDate)}
                    </td>
                    <td className="order-review-date-col text-center">
                      {formatDateTimeCell(order.deliveryDate)}
                    </td>
                    <td className="order-review-date-col text-center">
                      {formatDateTimeCell(order.billDate)}
                    </td>
                    <td className="order-review-log-cell order-review-log-col">
                      {order.log ? (
                        <pre className="log-text">{order.log}</pre>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="orders-controls mt-3">
          <div className="orders-controls__section orders-controls__section--left">
            <DisplayPage
              recordsPerPage={recordsPerPage}
              setRecordsPerPage={setRecordsPerPage}
              currentPage={currentPage}
              totalCount={totalCount}
              setCurrentPage={setCurrentPage}
              selectProps={{
                id: "orderReviewPerPage",
                name: "orderReviewPerPage",
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
      </div>
    </div>
  );
}

export default OrderReview;
