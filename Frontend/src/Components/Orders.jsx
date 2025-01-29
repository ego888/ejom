import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import Button from "./UI/Button";
import { ServerIP } from "../config";

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [isProdChecked, setIsProdChecked] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);

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
    if (selectedStatuses.length === 0 && statusOptions.length > 0) {
      setOrders([]);
      setTotalCount(0);
    } else {
      fetchOrders();
    }
  }, [
    currentPage,
    recordsPerPage,
    sortConfig,
    searchTerm,
    selectedStatuses,
    statusOptions,
  ]);

  // Fetch status options
  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        console.log("Fetching status options..."); // Debug log
        const token = localStorage.getItem("token");
        console.log("Token:", token ? "exists" : "missing"); // Debug log
        const response = await axios.get(`${ServerIP}/auth/order-statuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Full API Response:", response); // Debug log
        console.log("Status response data:", response.data); // Debug log
        if (response.data.Status) {
          const sortedStatuses = response.data.Result.sort(
            (a, b) => a.step - b.step
          );
          console.log("Sorted statuses:", sortedStatuses); // Debug log
          setStatusOptions(sortedStatuses);

          // Set first 5 statuses as selected by default
          const firstFiveStatuses = sortedStatuses
            .slice(0, 5)
            .map((s) => s.statusId);
          setSelectedStatuses(firstFiveStatuses);

          // Check if all prod statuses are included in the first 5
          const prodStatuses = sortedStatuses
            .slice(2, 6)
            .map((s) => s.statusId);
          const selectedProdStatuses = firstFiveStatuses.filter((s) =>
            prodStatuses.includes(s)
          );
          setIsProdChecked(selectedProdStatuses.length === prodStatuses.length);
        } else {
          console.log("API returned Status: false"); // Debug log
        }
      } catch (err) {
        console.error("Detailed error fetching status options:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });

        // Handle token expiration
        if (
          err.response?.status === 401 ||
          err.response?.data?.Error === "jwt expired" ||
          err.message.includes("jwt expired")
        ) {
          localStorage.removeItem("token");
          alert("Your session has expired. Please log in again.");
          navigate("/");
          return;
        }

        // For other errors, show the fallback status buttons
        setStatusOptions([]);
      }
    };
    fetchStatusOptions();
  }, [navigate]);

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
    const updatedStatuses = selectedStatuses.includes(statusId)
      ? selectedStatuses.filter((s) => s !== statusId)
      : [...selectedStatuses, statusId];
    setSelectedStatuses(updatedStatuses);
    setCurrentPage(1);

    // Update Prod checkbox state
    const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
    const selectedProdStatuses = updatedStatuses.filter((s) =>
      prodStatuses.includes(s)
    );
    setIsProdChecked(selectedProdStatuses.length === prodStatuses.length);

    // Update All checkbox state
    setIsAllChecked(updatedStatuses.length === statusOptions.length);
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

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
    if (e.target.checked) {
      const newStatuses = [...new Set([...selectedStatuses, ...prodStatuses])];
      setSelectedStatuses(newStatuses);
      setIsProdChecked(true);
      // Update All checkbox state
      setIsAllChecked(newStatuses.length === statusOptions.length);
    } else {
      const newStatuses = selectedStatuses.filter(
        (s) => !prodStatuses.includes(s)
      );
      setSelectedStatuses(newStatuses);
      setIsProdChecked(false);
      setIsAllChecked(false);
    }
  };

  const isAllIndeterminate = () => {
    return (
      selectedStatuses.length > 0 &&
      selectedStatuses.length < statusOptions.length
    );
  };

  const handleAllCheckbox = (e) => {
    if (e.target.checked) {
      setSelectedStatuses(statusOptions.map((s) => s.statusId));
      setIsProdChecked(true);
    } else {
      setSelectedStatuses([]);
      setIsProdChecked(false);
    }
    setIsAllChecked(e.target.checked);
  };

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
              <th>Order Date</th>
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
                <td>{order.clientName}</td>
                <td>{order.projectName}</td>
                <td>{order.orderedBy}</td>
                <td>
                  {order.orderDate
                    ? new Date(order.orderDate).toLocaleDateString()
                    : ""}
                </td>
                <td>
                  {order.dueDate
                    ? new Date(order.dueDate).toLocaleDateString()
                    : ""}
                </td>
                <td>{order.dueTime || ""}</td>
                <td>
                  <span
                    className={`badge ${
                      order.status === "Open"
                        ? "bg-success"
                        : order.status === "In Progress"
                        ? "bg-warning"
                        : order.status === "Completed"
                        ? "bg-primary"
                        : "bg-secondary"
                    }`}
                  >
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
                <td>{order.salesName}</td>
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
