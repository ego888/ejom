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
import "./Payment.css";
import axios from "../utils/axiosConfig"; // Import configured axios

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
    const saved = localStorage.getItem("paymentsSortConfig");
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
  const [searchClientName, setSearchClientName] = useState("");
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState({
    clientName: "",
    payDate: new Date().toISOString().split("T")[0],
    payType: "CASH",
    amount: "",
    payReference: "",
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      console.log("Selected statuses before fetch:", selectedStatuses);
      console.log("Current page before fetch:", currentPage);

      // Only proceed with the fetch if there are selected statuses
      if (selectedStatuses.length === 0) {
        setOrders([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Reset to page 1 if current page is greater than total pages
      let pageToFetch = currentPage;
      if (totalPages > 0 && currentPage > totalPages) {
        pageToFetch = 1;
        setCurrentPage(1);
      }

      const response = await axios.get(`${ServerIP}/auth/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pageToFetch,
          limit: recordsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
          search: searchTerm,
          statuses: selectedStatuses.join(","),
          sales: selectedSales.length ? selectedSales.join(",") : undefined,
          clients: selectedClients.length
            ? selectedClients.join(",")
            : undefined,
        },
      });

      console.log("API Request params:", {
        page: pageToFetch,
        limit: recordsPerPage,
        statuses: selectedStatuses.join(","),
      });
      console.log("API Response:", response.data);

      if (response.data.Status) {
        if (response.data.Result.orders.length === 0 && pageToFetch > 1) {
          // If no results and not on first page, try fetching first page
          setCurrentPage(1);
          return; // The useEffect will trigger another fetch
        }
        setOrders(response.data.Result.orders);
        setTotalCount(response.data.Result.total);
        setTotalPages(response.data.Result.totalPages);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders when parameters change
  useEffect(() => {
    console.log("Effect triggered with selectedStatuses:", selectedStatuses); // Debug log
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

          // Get only the Prod statuses (indices 2-5)
          const prodStatuses = sortedStatuses
            .slice(2, 6)
            .map((s) => s.statusId);
          console.log("Setting initial prod statuses:", prodStatuses); // Debug log

          setSelectedStatuses(prodStatuses);
          setIsProdChecked(true);
          setIsAllChecked(false);

          // Save to localStorage
          localStorage.setItem(
            "orderStatusFilters",
            JSON.stringify(prodStatuses)
          );
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

  // Add useEffect to fetch payment types
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const response = await axios.get(`${ServerIP}/auth/payment-types`);
        if (response.data.Status) {
          setPaymentTypes(response.data.Result);
        }
      } catch (err) {
        console.error("Error fetching payment types:", err);
      }
    };
    fetchPaymentTypes();
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
    localStorage.setItem("paymentsSortConfig", JSON.stringify(newSortConfig));
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

  const handleClientSearch = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Only prevent default for Enter
      const nextInput = e.target.form.elements[e.target.tabIndex + 1];
      if (nextInput) nextInput.focus();

      if (!searchClientName.trim()) return;

      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${ServerIP}/auth/search-orders-by-client`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { clientName: searchClientName },
          }
        );

        if (response.data.Status) {
          setOrders(response.data.Result.orders || []);
          setTotalCount(response.data.Result.total || 0);
          setTotalPages(response.data.Result.totalPages || 0);
          setPaymentInfo((prev) => ({
            ...prev,
            clientName: searchClientName,
          }));
        }
      } catch (error) {
        console.error("Error searching orders by client:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Add useEffect to focus on client name input when component mounts
  useEffect(() => {
    const clientNameInput = document.querySelector('input[name="clientName"]');
    if (clientNameInput) {
      clientNameInput.focus();
    }
  }, []);

  const handleClientBlur = async () => {
    if (!searchClientName.trim()) return; // Don't search if empty

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/search-orders-by-client`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { clientName: searchClientName },
        }
      );

      if (response.data.Status) {
        setOrders(response.data.Result.orders || []);
        setTotalCount(response.data.Result.total || 0);
        setTotalPages(response.data.Result.totalPages || 0);
        setPaymentInfo((prev) => ({
          ...prev,
          clientName: searchClientName,
        }));
      }
    } catch (error) {
      console.error("Error searching orders by client:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentInfoChange = (field, value) => {
    setPaymentInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="payment-theme">
      <div className="payment-page-background px-5">
        <div className="payment-header d-flex justify-content-center">
          <h3>Payment Processing</h3>
        </div>

        {/* Payment Info Header */}
        <div className="payment-info-header mb-4">
          <div className="row align-items-center">
            <div className="col-md-2">
              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={paymentInfo.payDate}
                  onChange={(e) =>
                    handlePaymentInfoChange("payDate", e.target.value)
                  }
                  tabIndex="1"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label>Payment Type</label>
                <select
                  className="form-control"
                  value={paymentInfo.payType}
                  onChange={(e) =>
                    handlePaymentInfoChange("payType", e.target.value)
                  }
                  tabIndex="2"
                >
                  {paymentTypes.map((type) => (
                    <option key={type.payType} value={type.payType}>
                      {type.payType}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  name="clientName"
                  className="form-control"
                  value={searchClientName}
                  onChange={(e) => setSearchClientName(e.target.value)}
                  onKeyDown={handleClientSearch}
                  placeholder="Type client name and press Enter"
                  tabIndex="3"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={paymentInfo.amount}
                  onChange={(e) =>
                    handlePaymentInfoChange("amount", e.target.value)
                  }
                  placeholder="Enter amount"
                  tabIndex="4"
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label>Reference</label>
                <input
                  type="text"
                  className="form-control"
                  value={paymentInfo.payReference}
                  onChange={(e) =>
                    handlePaymentInfoChange("payReference", e.target.value)
                  }
                  placeholder="Enter reference"
                  tabIndex="5"
                />
              </div>
            </div>
          </div>
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
                <th>Order Ref</th>
                <th
                  onClick={() => handleSort("salesName")}
                  style={{
                    cursor: "pointer",
                    color: hasSalesFilter ? "#0d6efd" : "inherit",
                  }}
                >
                  Sales {getSortIndicator("salesName")}
                </th>
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
                <th>Amount Paid</th>
                <th>Payment</th>
                <th>WTax</th>
                <th>Balance</th>
                <th
                  onClick={() => handleSort("ornum")}
                  style={{ cursor: "pointer" }}
                >
                  OR# {getSortIndicator("ornum")}
                </th>
                <th>Date Paid</th>
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
                          navigate(`/dashboard/payment/view/${order.id}`)
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
                  <td>{order.orderReference}</td>
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
                  <td>
                    {order.amountPaid
                      ? `₱${order.amountPaid.toLocaleString()}`
                      : ""}
                  </td>
                  <td>
                    {order.payment ? `₱${order.payment.toLocaleString()}` : ""}
                  </td>
                  <td>{order.wtax ? `₱${order.wtax.toLocaleString()}` : ""}</td>
                  <td className="number_right">
                    {order.grandTotal && order.amountPaid
                      ? `₱${(
                          order.grandTotal - order.amountPaid
                        ).toLocaleString()}`
                      : ""}
                  </td>
                  <td>{order.ornum || ""}</td>
                  <td>
                    {order.datePaid
                      ? new Date(order.datePaid).toLocaleDateString()
                      : ""}
                  </td>
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
