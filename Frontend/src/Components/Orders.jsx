import axios from "axios";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import "./Orders.css";

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
  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    const saved = localStorage.getItem("orderStatusFilters");
    return saved ? JSON.parse(saved) : [];
  });
  const [salesEmployees, setSalesEmployees] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showSalesMenu, setShowSalesMenu] = useState(false);
  const [salesMenuPosition, setSalesMenuPosition] = useState({ x: 0, y: 0 });
  const salesMenuRef = useRef(null);
  const [isProdChecked, setIsProdChecked] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const itemsPerPage = 10; // Or whatever your current items per page value is
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [clientMenuPosition, setClientMenuPosition] = useState({ x: 0, y: 0 });
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const clientMenuRef = useRef(null);
  const clientSearchRef = useRef(null);

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

      if (response.data.Status) {
        setOrders(response.data.Result.orders);
        setTotalCount(response.data.Result.total);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
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
          // Initially select all sales employees
          setSelectedSales(response.data.Result.map((emp) => emp.id));
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
    setSortConfig({ key, direction });
    setCurrentPage(1);
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

  // Handle sales cell click
  const handleSalesClick = (e, salesName) => {
    e.stopPropagation(); // Prevent event bubbling
    const rect = e.target.getBoundingClientRect();
    setSalesMenuPosition({
      x: rect.left,
      y: rect.bottom,
    });
    setShowSalesMenu(true);
  };

  // Handle sales checkbox change
  const handleSalesCheckboxChange = (salesId) => {
    setSelectedSales((prev) => {
      if (prev.includes(salesId)) {
        return prev.filter((id) => id !== salesId);
      } else {
        return [...prev, salesId];
      }
    });
  };

  // Handle check all sales
  const handleCheckAllSales = () => {
    if (selectedSales.length === salesEmployees.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(salesEmployees.map((emp) => emp.id));
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        salesMenuRef.current &&
        !salesMenuRef.current.contains(event.target)
      ) {
        setShowSalesMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Add client search function
  const searchClients = useCallback(
    debounce(async (term) => {
      try {
        const token = localStorage.getItem("token");
        if (term.length === 0) {
          // When search is empty, show only selected clients
          if (selectedClients.length > 0) {
            setClientResults(selectedClients);
          } else {
            setClientResults([]);
          }
          return;
        }

        const response = await axios.get(`${ServerIP}/auth/clients/search`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { query: term },
        });

        if (response.data.Status) {
          // Combine search results with selected clients
          const searchResults = response.data.Result;
          const combinedResults = [
            ...new Set([...selectedClients, ...searchResults]),
          ];
          setClientResults(combinedResults);
        }
      } catch (err) {
        console.error("Error searching clients:", err);
      }
    }, 300),
    [selectedClients] // Add selectedClients to dependencies
  );

  // Handle client cell click
  const handleClientClick = (e, clientName) => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    setClientMenuPosition({
      x: rect.left,
      y: rect.bottom,
    });
    setShowClientMenu(true);
    // Pre-populate search with first 5 characters
    const initialSearch = clientName.slice(0, 5);
    setClientSearchTerm(initialSearch);
    searchClients(initialSearch);

    // Focus the search input after a short delay
    setTimeout(() => {
      if (clientSearchRef.current) {
        clientSearchRef.current.focus();
      }
    }, 100);
  };

  // Handle client checkbox change
  const handleClientCheckboxChange = (clientName) => {
    setSelectedClients((prev) => {
      if (prev.includes(clientName)) {
        return prev.filter((name) => name !== clientName);
      } else {
        return [...prev, clientName];
      }
    });
  };

  // Handle select all clients
  const handleSelectAllClients = () => {
    if (clientResults.length === selectedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients([...clientResults]);
    }
  };

  // Close client menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        clientMenuRef.current &&
        !clientMenuRef.current.contains(event.target)
      ) {
        setShowClientMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update client search results when search term changes
  useEffect(() => {
    searchClients(clientSearchTerm);
  }, [clientSearchTerm, searchClients]);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
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

      {/* Add the sales context menu */}
      {showSalesMenu && (
        <div
          ref={salesMenuRef}
          className="sales-menu"
          style={{
            left: `${salesMenuPosition.x}px`,
            top: `${salesMenuPosition.y}px`,
          }}
        >
          <div className="sales-menu-header">
            <input
              type="checkbox"
              className="sales-menu-checkbox form-check-input"
              checked={selectedSales.length === salesEmployees.length}
              onChange={handleCheckAllSales}
            />
            <label className="form-check-label">Select All</label>
          </div>
          {salesEmployees.map((employee) => (
            <div key={employee.id} className="sales-menu-item">
              <input
                type="checkbox"
                className="sales-menu-checkbox form-check-input"
                checked={selectedSales.includes(employee.id)}
                onChange={() => handleSalesCheckboxChange(employee.id)}
              />
              <label className="form-check-label">{employee.name}</label>
            </div>
          ))}
        </div>
      )}

      {/* Add the client search menu */}
      {showClientMenu && (
        <div
          ref={clientMenuRef}
          className="client-menu"
          style={{
            left: `${clientMenuPosition.x}px`,
            top: `${clientMenuPosition.y}px`,
          }}
        >
          <div className="client-menu-search">
            <input
              ref={clientSearchRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Search clients..."
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
            />
          </div>
          {clientResults.length > 0 && (
            <div className="client-menu-header">
              <input
                type="checkbox"
                className="client-menu-checkbox form-check-input"
                checked={clientResults.length === selectedClients.length}
                onChange={handleSelectAllClients}
              />
              <label className="form-check-label">Select All</label>
            </div>
          )}
          <div className="client-menu-items">
            {clientResults.map((clientName) => (
              <div key={clientName} className="client-menu-item">
                <input
                  type="checkbox"
                  className="client-menu-checkbox form-check-input"
                  checked={selectedClients.includes(clientName)}
                  onChange={() => handleClientCheckboxChange(clientName)}
                />
                <label className="form-check-label">{clientName}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
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
                style={{ cursor: "pointer" }}
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
                style={{ cursor: "pointer" }}
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
                        navigate(`/dashboard/view_order/${order.id}`)
                      }
                    />
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
                  onClick={(e) => handleClientClick(e, order.clientName)}
                  className="client-cell"
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
                  onClick={(e) => handleSalesClick(e, order.salesName)}
                  className="sales-cell"
                >
                  {order.salesName}
                </td>
                <td>{order.orderReference}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-start mt-3">
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{
                width: "auto",
                fontSize: "0.75rem",
                padding: "0.1rem 1.5rem 0.1rem 0.5rem",
                height: "auto",
              }}
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              {(currentPage - 1) * recordsPerPage + 1} to{" "}
              {Math.min(currentPage * recordsPerPage, totalCount)} of{" "}
              {totalCount} entries
            </div>
          </div>

          {/* Status filter badges */}
          <div className="d-flex flex-column align-items-center gap-0">
            {/* Status Badges */}
            <div className="d-flex gap-1">
              {statusOptions && statusOptions.length > 0 ? (
                statusOptions.map((status) => (
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
                ))
              ) : (
                <div>Loading statuses...</div>
              )}
            </div>

            {/* Prod Section */}
            <div
              className="position-relative w-100"
              style={{ padding: "0.25rem 0" }}
            >
              <div
                className="position-absolute"
                style={{
                  height: "1px",
                  backgroundColor: "#ccc",
                  width: "50%",
                  left: "25%",
                  top: "50%",
                  zIndex: 0,
                }}
              ></div>
              <div
                className="d-flex justify-content-center"
                style={{ position: "relative", zIndex: 1 }}
              >
                <div className="d-flex align-items-center bg-white px-2">
                  <input
                    type="checkbox"
                    className="form-check-input me-1"
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isProdIndeterminate();
                      }
                    }}
                    checked={isProdChecked}
                    onChange={handleProdCheckbox}
                  />
                  <label className="form-check-label">Prod</label>
                </div>
              </div>
            </div>

            {/* All Section */}
            <div
              className="position-relative w-100"
              style={{ padding: "0rem 0" }}
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
                <div className="d-flex align-items-center bg-white px-2">
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

          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{ fontSize: "0.75rem" }}
                >
                  First
                </button>
              </li>
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ fontSize: "0.75rem" }}
                >
                  Previous
                </button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li
                  key={i + 1}
                  className={`page-item ${
                    currentPage === i + 1 ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(i + 1)}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ fontSize: "0.75rem" }}
                >
                  Next
                </button>
              </li>
              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{ fontSize: "0.75rem" }}
                >
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Orders;
