import axios from "axios";
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
  const [forProdSort, setForProdSort] = useState("none"); // 'none', 'asc', 'desc'
  const [orderIdInput, setOrderIdInput] = useState("");

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
          forProdSort: forProdSort !== "none" ? forProdSort : undefined,
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
    setSortConfig({ key, direction });
    // Reset forProd sort when sorting by other columns
    setForProdSort("none");
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

  // Add function to handle forProd update
  const handleForProdChange = async (orderId, newValue) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update-for-prod/${orderId}`,
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
        console.error("Failed to update forProd status");
      }
    } catch (error) {
      console.error("Error updating forProd status:", error);
    }
  };

  // Add function to handle forProd header click
  const handleForProdSort = () => {
    const nextSort =
      forProdSort === "none" ? "asc" : forProdSort === "asc" ? "desc" : "none";
    setForProdSort(nextSort);

    if (nextSort !== "none") {
      setSortConfig({ key: "forProd", direction: nextSort });
    } else {
      setSortConfig({ key: "id", direction: "desc" }); // Default sort when forProd sort is disabled
    }
  };

  const handleOrderIdSubmit = async (e) => {
    if (e.key === "Enter") {
      const orderId = e.target.value.trim();
      if (orderId) {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.put(
            `${ServerIP}/auth/update-for-prod/${orderId}`,
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

  const handlePrintProduction = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/orders-details-forprod`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("ORders-Details:", response.data);
      if (!response.data.Status) {
        throw new Error("Failed to fetch production orders");
      }

      const ordersWithDetails = response.data.Result;
      console.log("GoLargeLogo:", GoLargeLogo);
      const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page { margin: 0.5cm; }
            @media print {
              body { margin: 0; }
              button { display: none; }
              tr:nth-child(even) {
                background-color: #e0e0e0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            body { 
              font-family: "Times New Roman", Times, serif;
              font-size: 10pt;
              margin: 0;
              padding: 15px;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              display: block;
            }
            .header img {
              max-width: 150px;
              margin-bottom: 10px;
              display: block !important;
              margin-left: auto;
              margin-right: auto;
            }
            .header .contact {
              font-weight: bold;
              margin: 5px 0;
              display: block;
            }
            .title-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: double 3px black;
              padding: 8px 0;
            }
            .title {
              text-align: center;
              font-weight: bold;
              flex-grow: 1;
            }
            .datetime {
              font-size: 10pt;
              white-space: nowrap;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
            }
            th, td { 
              padding: 4px; 
              text-align: center;
              border: none;
            }
            td:nth-child(1), /* OrderId */
            td:nth-child(2), /* Client */
            td:nth-child(3), /* Project Name */
            td:nth-child(4)  /* Due Date & Time */ {
              text-align: left;
            }
            th { 
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
              border-top: 1px solid black;
              border-bottom: 1px solid black;
            }
            tr:nth-child(even) {
              background-color: #e0e0e0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .totals {
              margin-top: 10px;
              font-weight: bold;
              display: grid;
              grid-template-columns: repeat(11, 1fr);
              border-bottom: double 3px black;
            }
            .totals .count {
              grid-column: 2;  /* Under Client column */
              text-align: left;
            }
            .totals .quantity {
              grid-column: 5;  /* Under Quantity column */
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img 
              src="${ServerIP}/Images/Go Large logo 2009C2 small.jpg" 
              alt="Go Large Logo" 
              style="max-width: 150px; display: block; margin: 0 auto;" 
              onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div style=\'text-align:center; font-weight:bold;\'>Go Large Logo</div>');"
            />
            <div class="contact">GO LARGE GRAPHICS, INC.</div>
            <div class="contact">TEL. # 416-8882</div>
          </div>
          <div class="title-row">
            <div style="width: 150px;"></div>
            <div class="title">PRODUCTION ORDER LIST</div>
            <div class="datetime">${new Date().toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
            })}    ${new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>OrderId</th>
                <th>Client</th>
                <th>Project Name</th>
                <th>Due Date & Time</th>
                <th>Quantity</th>
                <th>Width</th>
                <th>Height</th>
                <th>Unit</th>
                <th>Material</th>
                <th>Hrs.</th>
                <th>Sq. Ft.</th>
              </tr>
            </thead>
            <tbody>
              ${ordersWithDetails
                .map((order) => {
                  // Create main row with first detail or empty values if no details
                  const firstDetail = order.order_details?.[0] || {};

                  let rows = `
                    <tr>
                      <td>${order.id}</td>
                      <td>${order.clientName || ""}</td>
                      <td>${order.projectName || ""}</td>
                      <td>${
                        order.dueDate
                          ? new Date(order.dueDate).toLocaleDateString()
                          : ""
                      } ${order.dueTime || ""}</td>
                      <td>${
                        firstDetail.quantity
                          ? firstDetail.quantity.toLocaleString()
                          : ""
                      }</td>
                      <td>${firstDetail.width || ""}</td>
                      <td>${firstDetail.height || ""}</td>
                      <td>${firstDetail.unit || ""}</td>
                      <td>${firstDetail.material || ""}</td>
                      <td>${firstDetail.printHrs || ""}</td>
                      <td>${firstDetail.squareFeet || ""}</td>
                    </tr>
                  `;

                  // Add remaining details with empty order info cells
                  if (order.order_details && order.order_details.length > 1) {
                    rows += order.order_details
                      .slice(1)
                      .map(
                        (detail) => `
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>${
                          detail.quantity
                            ? detail.quantity.toLocaleString()
                            : ""
                        }</td>
                        <td>${detail.width || ""}</td>
                        <td>${detail.height || ""}</td>
                        <td>${detail.unit || ""}</td>
                        <td>${detail.material || ""}</td>
                        <td>${detail.printHrs || ""}</td>
                        <td>${detail.squareFeet || ""}</td>
                      </tr>
                    `
                      )
                      .join("");
                  }

                  return rows;
                })
                .join("")}
              <tr style="font-weight: bold; border-top: 1px solid black; border-bottom: double 1px black;">
                <td></td>
                <td style="text-align: left;">Count: ${
                  ordersWithDetails.length
                }</td>
                <td></td>
                <td style="text-align: right;">Total Quantity:</td>
                <td>${ordersWithDetails
                  .reduce(
                    (total, order) =>
                      total +
                      (order.order_details?.reduce(
                        (sum, detail) => sum + (detail.quantity || 0),
                        0
                      ) || 0),
                    0
                  )
                  .toLocaleString()}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>

            </tbody>
          </table>
        </body>
      </html>
    `;

      const printWindow = document.createElement("iframe");
      printWindow.style.display = "none";
      document.body.appendChild(printWindow);
      printWindow.contentDocument.write(printContent);
      printWindow.contentDocument.close();
      printWindow.contentWindow.focus();
      printWindow.contentWindow.print();
      document.body.removeChild(printWindow);
    } catch (error) {
      console.error("Error preparing production list:", error);
    }
  };

  const handlePrintAllDR = () => {
    const content = `
      <style>
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        @media print {
          body { margin: 0; }
          button { display: none; }
        }
      </style>
      <div id="print-content">
        <h2>Delivery Receipt List</h2>
        <table>
          <thead>
            <tr>
              <th>DR#</th>
              <th>Order ID</th>
              <th>Client</th>
              <th>Project Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .filter((order) => order.drnum)
              .map(
                (order) => `
                <tr>
                  <td>${order.drnum}</td>
                  <td>${order.id}</td>
                  <td>${order.clientName}</td>
                  <td>${order.projectName}</td>
                  <td>${order.status}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    const printWindow = document.createElement("iframe");
    printWindow.style.display = "none";
    document.body.appendChild(printWindow);
    printWindow.contentDocument.write(content);
    printWindow.contentDocument.close();
    printWindow.contentWindow.focus();
    printWindow.contentWindow.print();
    document.body.removeChild(printWindow);
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
              type="text"
              className="form-control form-control-sm"
              placeholder="Enter Order ID"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              onKeyPress={handleOrderIdSubmit}
              style={{ width: "150px" }}
            />
            <Button variant="save" onClick={handlePrintProduction}>
              Production
            </Button>
            <Button variant="view" onClick={handlePrintAllDR}>
              All DR
            </Button>
          </div>
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
                <th onClick={handleForProdSort} style={{ cursor: "pointer" }}>
                  <div className="d-flex align-items-center">
                    <CheckBoxHeader
                      checked={forProdSort !== "none"}
                      indeterminate={forProdSort === "desc"}
                    />
                    {forProdSort === "asc"
                      ? " ↑"
                      : forProdSort === "desc"
                      ? " ↓"
                      : ""}
                  </div>
                </th>
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
                          navigate(`/dashboard/view_order/${order.id}`)
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
                  <td>
                    <input
                      type="checkbox"
                      checked={order.forProd || false}
                      onChange={(e) =>
                        handleForProdChange(order.id, e.target.checked)
                      }
                    />
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
