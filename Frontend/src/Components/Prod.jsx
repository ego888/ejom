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
import CheckBoxHeader from "./UI/CheckBoxHeader";
import "./Orders.css";
import "./Prod.css";
import GoLargeLogo from "../assets/Go Large logo 2009C2 small.jpg";
import { QRCodeSVG } from "qrcode.react";
import ModalAlert from "./UI/ModalAlert";
import axios from "../utils/axiosConfig"; // Import configured axios
import Modal from "./UI/Modal";
//import { handlePrintProduction } from "./ProdPrintProduction";
//import { handlePrintAllDR } from "./ProdPrintAllDR";

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
    const saved = localStorage.getItem("prodSortConfig");
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
  const [forProdSort, setForProdSort] = useState(() => {
    return localStorage.getItem("prodForProdSort") || "none";
  });
  const [orderIdInput, setOrderIdInput] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });
  const [showInvModal, setShowInvModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [invNumber, setInvNumber] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
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

      if (response.data.Status) {
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
    // Reset forProd sort when sorting by other columns
    setForProdSort("none");
    localStorage.setItem("prodSortConfig", JSON.stringify(newSortConfig));
    localStorage.setItem("prodForProdSort", "none");
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

  // Add function to handle forProd update
  const handleForProdChange = async (orderId, newValue) => {
    // Find the order to check its status
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Check if status is Open or Printed
    if (order.status !== "Open" && order.status !== "Printed") {
      setAlert({
        show: true,
        title: "Invalid Status",
        message:
          "Only orders with 'Open' or 'Printed' status can be marked for production.",
        type: "alert",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update-forprod/${orderId}`,
        { forProd: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.Status) {
        // Update the local state
        setOrders(
          orders.map((order) =>
            order.id === orderId ? { ...order, forProd: newValue } : order
          )
        );
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to update production status",
          type: "alert",
        });
      }
    } catch (error) {
      console.error("Error updating forProd status:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update production status: " + error.message,
        type: "alert",
      });
    }
  };

  // Add function to handle forProd header click
  const handleForProdSort = () => {
    const nextSort =
      forProdSort === "none" ? "desc" : forProdSort === "asc" ? "desc" : "none";
    setForProdSort(nextSort);
    localStorage.setItem("prodForProdSort", nextSort);

    if (nextSort !== "none") {
      const newSortConfig = { key: "forProd", direction: nextSort };
      setSortConfig(newSortConfig);
      localStorage.setItem("prodSortConfig", JSON.stringify(newSortConfig));
    } else {
      const defaultSort = { key: "id", direction: "desc" };
      setSortConfig(defaultSort);
      localStorage.setItem("prodSortConfig", JSON.stringify(defaultSort));
    }
  };

  const handleOrderIdSubmit = async (e) => {
    if (e.key === "Enter") {
      const orderId = e.target.value.trim();
      if (orderId) {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.put(
            `${ServerIP}/auth/update-forprod/${orderId}`,
            { forProd: true },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.Status) {
            // Update the local state if the order is in the current view
            setOrders(
              orders.map((order) =>
                order.id === parseInt(orderId)
                  ? { ...order, forProd: true }
                  : order
              )
            );
            setOrderIdInput(""); // Clear input after successful update
          }
        } catch (error) {
          console.error("Error updating forProd status:", error);
        }
      }
    }
  };

  const handlePrintDRClick = () => {
    navigate("/dashboard/prod_print_dr");
  };

  const handlePrintProductionClick = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/orders-details-forprod`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.Status) {
        throw new Error(
          response.data.Error || "Failed to fetch production data"
        );
      }

      const orders = response.data.Result;

      if (orders.length === 0) {
        setAlert({
          show: true,
          title: "Error",
          message: "Please mark orders for production before printing",
          type: "alert",
        });
        return;
      }

      // Store flags in sessionStorage to indicate we're coming back from printing production
      sessionStorage.setItem("returnFromPrinting", "true");
      sessionStorage.setItem("printType", "production");
      navigate("/dashboard/print_production");
    } catch (err) {
      console.error("Error printing production orders:", err);
      setAlert({
        show: true,
        title: "Error",
        message: err.message || "Failed to fetch production orders",
        type: "alert",
      });
    }
  };

  // Function to update orders to Prod status
  const updateOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const updateResponse = await axios.put(
        `${ServerIP}/auth/update_orders_to_prod`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (updateResponse.data.Status) {
        fetchOrders();
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to update orders status",
          type: "alert",
        });
      }
    } catch (error) {
      console.error("Error updating orders status:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update orders status: " + error.message,
        type: "alert",
      });
    }
  };

  // Check if returning from printing
  useEffect(() => {
    const returnFromPrinting = sessionStorage.getItem("returnFromPrinting");
    if (returnFromPrinting) {
      sessionStorage.removeItem("returnFromPrinting");
      const printType = sessionStorage.getItem("printType");
      sessionStorage.removeItem("printType");

      if (printType === "production") {
        setAlert({
          show: true,
          title: "Confirm Update",
          message:
            "Was the printing successful? Click OK to update orders to production status.",
          type: "confirm",
          onConfirm: updateOrders,
        });
      }
    }
  }, []);

  const handleInvClick = (order) => {
    const billableStatuses = [
      "Open",
      "Printed",
      "Prod",
      "Finished",
      "Delivered",
    ];
    if (billableStatuses.includes(order.status)) {
      setSelectedOrderId(order.id);
      setInvNumber("");
      setShowInvModal(true);
    }
  };

  const handleInvSubmit = async () => {
    if (!invNumber.trim()) {
      setAlert({
        show: true,
        title: "Error",
        message: "Please enter an invoice number",
        type: "error",
      });
      return;
    }

    try {
      const response = await axios.put(
        `${ServerIP}/auth/update_order_invoice`,
        {
          orderId: selectedOrderId,
          invNumber: invNumber.trim(),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          title: "Success",
          message: "Invoice number updated successfully",
          type: "alert",
        });
        fetchOrders(); // Refresh the orders list
        setShowInvModal(false);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error,
          type: "error",
        });
      }
    } catch (error) {
      handleApiError(error, setAlert);
    }
  };

  return (
    <div className="prod-theme">
      <div className="prod-page-background px-5">
        <div className="d-flex justify-content-center">
          <h3>Production Control</h3>
        </div>
        {/* Search and filters row */}
        <div className="d-flex justify-content-between mb-3">
          <div className="d-flex gap-2 align-items-center">
            <input
              id="order-id-input"
              type="text"
              className="form-control form-control-sm"
              placeholder="Enter Order ID"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              onKeyPress={handleOrderIdSubmit}
              style={{ width: "150px" }}
            />
            <Button
              variant="save"
              onClick={handlePrintProductionClick}
              aria-label="Print Production"
            >
              Print Production
            </Button>
            <Button
              variant="view"
              onClick={handlePrintDRClick}
              aria-label="Print DR"
            >
              Print DR
            </Button>
          </div>
          <input
            id="prod-search-input"
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
                <th className="text-center">Action</th>
                <th onClick={handleForProdSort} style={{ cursor: "pointer" }}>
                  <div className="d-flex align-items-center">
                    <CheckBoxHeader
                      id="forProdSort-checkbox"
                      checked={forProdSort !== "none"}
                      indeterminate={forProdSort === "desc"}
                    />
                    {forProdSort === "desc"
                      ? " ↑"
                      : forProdSort === "asc"
                      ? " ↓"
                      : ""}
                  </div>
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                  aria-sort={
                    sortConfig.key === "id" ? sortConfig.direction : "none"
                  }
                >
                  Order ID {getSortIndicator("id")}
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("clientName")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  Client {getSortIndicator("clientName")}
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
                  className="text-center"
                  onClick={() => handleSort("salesName")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  Sales {getSortIndicator("salesName")}
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
                        variant="view"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/prod/view/${order.id}`)
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <div className="checkbox-container">
                      <label
                        htmlFor={`prod-check-${order.id}`}
                        className="visually-hidden"
                      >
                        Mark order {order.id} for production
                      </label>
                      <input
                        id={`prod-check-${order.id}`}
                        type="checkbox"
                        checked={order.forProd || false}
                        onChange={(e) =>
                          handleForProdChange(order.id, e.target.checked)
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
                    <span
                      className={`status-badge ${order.status}`}
                      style={{ cursor: "default" }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>{order.drnum || ""}</td>
                  <td
                    onClick={() => handleInvClick(order)}
                    style={{
                      cursor: [
                        "Open",
                        "Printed",
                        "Prod",
                        "Finished",
                        "Delivered",
                      ].includes(order.status)
                        ? "pointer"
                        : "default",
                    }}
                  >
                    {order.invnum || ""}
                  </td>
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
      </div>

      <Modal
        show={showInvModal}
        onHide={() => setShowInvModal(false)}
        title="Enter Invoice Number"
        footer={
          <div className="d-flex justify-content-end gap-2">
            <Button variant="cancel" onClick={() => setShowInvModal(false)}>
              Cancel
            </Button>
            <Button variant="save" onClick={handleInvSubmit}>
              Save
            </Button>
          </div>
        }
      >
        <div className="mb-3">
          <label htmlFor="invNumber" className="form-label">
            Invoice Number
          </label>
          <input
            type="text"
            className="form-control"
            id="invNumber"
            value={invNumber}
            onChange={(e) => setInvNumber(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

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

export default Prod;
