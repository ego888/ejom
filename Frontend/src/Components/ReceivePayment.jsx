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
import "./Payment.css";
import axios from "../utils/axiosConfig"; // Import configured axios
import { formatPeso, formatDate, formatDateTime } from "../utils/orderUtils";
import ModalAlert from "../Components/UI/ModalAlert";
import ViewCustomerInfo from "./UI/ViewCustomerInfo";

function ReceivePayment() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("payments");
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
  const [searchClientName, setSearchClientName] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    const saved = localStorage.getItem("orderStatusFilter");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSales, setSelectedSales] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [hasClientFilter, setHasClientFilter] = useState(false);
  const [hasSalesFilter, setHasSalesFilter] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const salesFilterRef = useRef(null);
  const clientFilterRef = useRef(null);
  // const [paymentTypes, setPaymentTypes] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState({
    clientName: "",
    payDate: new Date().toISOString().split("T")[0],
    payType: "CASH",
    amount: "",
    payReference: "",
    ornum: "",
  });
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [checkPay, setCheckPay] = useState(new Set());
  const [orderPayments, setOrderPayments] = useState({});
  // const [wtaxTypes, setWtaxTypes] = useState([]);
  // const [selectedWtax, setSelectedWtax] = useState(null);
  // const [vatRate, setVatRate] = useState(0);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "",
    onConfirm: null,
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tempPayId, setTempPayId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem("paymentSearchTerm") || "";
  });
  const [displaySearchTerm, setDisplaySearchTerm] = useState(() => {
    return localStorage.getItem("paymentSearchTerm") || "";
  });
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const hoverTimerRef = useRef(null);

  // Payment state variables
  const [payments, setPayments] = useState([]);
  const [paymentTotalCount, setPaymentTotalCount] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(0);
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const [paymentSortConfig, setPaymentSortConfig] = useState({
    key: "postedDate",
    direction: "desc",
  });
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [paymentTypeTotals, setPaymentTypeTotals] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [includeReceived, setIncludeReceived] = useState(false);
  const [remittedDateFilter, setRemittedDateFilter] = useState("");

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
      localStorage.setItem("paymentSearchTerm", term);
    }, 500),
    []
  );

  // Update handleSearch to use debounce
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setDisplaySearchTerm(term);
    debouncedSearch(term);
  };

  // 1. Move fetchOrderData outside useEffect
  const fetchOrderData = async () => {
    console.log("fetchOrderData function called");
    setLoading(true);
    try {
      if (selectedStatuses.length === 0) {
        setOrders([]);
        setTotalCount(0);
        setTotalPages(0);
        setLoading(false);
        return;
      }

      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        statuses: selectedStatuses.join(","),
        sales: selectedSales.length ? selectedSales.join(",") : undefined,
        clients: selectedClients.length ? selectedClients.join(",") : undefined,
        ...(searchTerm.trim() && {
          search: searchTerm.trim(),
          searchFields: [
            "id",
            "clientName",
            "customerName",
            "orderedBy",
            "drnum",
            "invnum",
            "ornum",
            "salesName",
            "amount",
            "orderReference",
            "remittedDate",
          ],
        }),
      };

      console.log("Search params:", params);
      const response = await axios.get(`${ServerIP}/auth/orders`, { params });

      if (response.data.Status) {
        setOrders(response.data.Result.orders || []);
        setTotalCount(response.data.Result.total || 0);
        setTotalPages(response.data.Result.totalPages || 0);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // 2. Update the initialization effect
  useEffect(() => {
    console.log("RUN initializeComponent");
    const initializeComponent = async () => {
      try {
        const [
          statusResponse,
          // wtaxResponse,
          // paymentTypesResponse,
          clientResponse,
          salesResponse,
          // vatResponse,
        ] = await Promise.all([
          axios.get(`${ServerIP}/auth/order-statuses`),
          // axios.get(`${ServerIP}/auth/wtax-types`),
          // axios.get(`${ServerIP}/auth/payment-types`),
          axios.get(`${ServerIP}/auth/clients`),
          axios.get(`${ServerIP}/auth/sales_employees`),
          // axios.get(`${ServerIP}/auth/jomcontrol/VAT`),
        ]);

        // Handle all responses
        if (statusResponse.data.Status) {
          const sortedStatuses = statusResponse.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);

          // Only set initial prod statuses if no saved filters exist
          const savedFilters = localStorage.getItem("orderStatusFilter");
          if (!savedFilters) {
            const prodStatuses = sortedStatuses
              .slice(2, 6)
              .map((s) => s.statusId);
            setSelectedStatuses(prodStatuses);
            localStorage.setItem(
              "orderStatusFilter",
              JSON.stringify(prodStatuses)
            );
          }
        }

        // if (wtaxResponse.data.Status) {
        //   setWtaxTypes(wtaxResponse.data.Result);
        //   // Set V2 as default WTax type
        //   const defaultWTax = wtaxResponse.data.Result.find(
        //     (wt) => wt.WTax === "V2"
        //   );
        //   if (defaultWTax) {
        //     setSelectedWtax(defaultWTax);
        //   }
        // }

        // if (vatResponse.data.Status) {
        //   setVatRate(vatResponse.data.Result.vatPercent);
        // }
        // if (paymentTypesResponse.data.Status)
        //   setPaymentTypes(paymentTypesResponse.data.Result);
        if (clientResponse.data.Status)
          setClientList(clientResponse.data.Result);
        if (salesResponse.data.Status)
          setSalesEmployees(salesResponse.data.Result);

        console.log("FINISH initializeComponent");
        // Call fetchOrderData after initialization is complete
        await fetchOrderData();
      } catch (error) {
        console.error("Error in initialization:", error);
      }
    };

    initializeComponent();
  }, []); // Run once on mount

  // Update useEffect dependencies
  useEffect(() => {
    fetchOrderData();
  }, [
    currentPage,
    recordsPerPage,
    sortConfig,
    selectedSales,
    selectedStatuses,
    selectedClients,
    searchTerm,
  ]);

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
    console.log("pageNumber 2", pageNumber);
    localStorage.setItem("ordersListPage", pageNumber.toString());
  };

  // Add function to check if payment inputs should be enabled
  const canEditPayments = () => {
    return (
      paymentInfo.payDate &&
      paymentInfo.payType &&
      searchClientName.trim() &&
      paymentInfo.amount > 0
    );
  };

  // Update canPost to check for OR#
  const canPost = () => {
    return (
      canEditPayments() && checkPay.size > 0 && paymentInfo.ornum.trim() !== ""
    ); // Add OR# validation
  };

  // Add function to get tooltip message
  const getTooltipMessage = () => {
    if (!searchClientName.trim()) return "Please select a client";
    if (!paymentInfo.ornum.trim()) return "Please enter OR#";
    if (!paymentInfo.amount) return "Please enter payment amount";
    if (checkPay.size === 0) return "Please select at least one order to pay";
    return "Please fill in all required fields";
  };

  const handleClientHover = (clientId) => {
    hoverTimerRef.current = setTimeout(() => {
      setSelectedClientId(clientId);
      setShowClientInfo(true);
    }, 1500); // 5 seconds
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

  // // Add handleApiError function
  // const handleApiError = (error) => {
  //   console.error("API Error:", error);
  //   setAlert({
  //     show: true,
  //     title: "Error",
  //     message:
  //       error.response?.data?.Error || "An error occurred while fetching data",
  //     type: "error",
  //   });
  // };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/payments`, {
        params: {
          page: paymentCurrentPage,
          limit: recordsPerPage,
          sortBy: paymentSortConfig.key,
          sortDirection: paymentSortConfig.direction,
          search: paymentSearchTerm,
          includeReceived: includeReceived ? "true" : "false",
          ...(remittedDateFilter && { remittedDate: remittedDateFilter }),
        },
      });

      console.log("Payments API Response:", response.data.Result);
      if (response.data.Status) {
        setPayments(response.data.Result.payments);
        setPaymentTotalCount(response.data.Result.total);
        setPaymentTotalPages(response.data.Result.totalPages);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to fetch payments",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setAlert({
        show: true,
        title: "Error",
        message:
          error.response?.data?.Error ||
          "An error occurred while fetching payments",
        type: "error",
      });
    }
  };

  // Add payment sort handler
  const handlePaymentSort = (key) => {
    let direction = "asc";
    if (
      paymentSortConfig.key === key &&
      paymentSortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setPaymentSortConfig({ key, direction });
    setPaymentCurrentPage(1);
  };

  // Add payment search handler
  const handlePaymentSearch = (e) => {
    const term = e.target.value;
    setPaymentSearchTerm(term);
    setPaymentCurrentPage(1);
  };

  const handleRemittedDateFilterChange = (e) => {
    setRemittedDateFilter(e.target.value);
    setPaymentCurrentPage(1);
  };

  const clearRemittedDateFilter = () => {
    setRemittedDateFilter("");
    setPaymentCurrentPage(1);
  };

  // Add useEffect for payments
  useEffect(() => {
    if (activeTab === "payments") {
      fetchPayments();
    }
  }, [
    activeTab,
    paymentCurrentPage,
    recordsPerPage,
    paymentSortConfig,
    paymentSearchTerm,
    includeReceived,
    remittedDateFilter,
  ]);

  // Add this function near the other payment handlers
  // const handlePaymentReceivedToggle = async (payment) => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const response = await axios.post(
  //       `${ServerIP}/auth/toggle-payment-received`,
  //       {
  //         payId: payment.payId,
  //         received: !payment.received,
  //       },
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );

  //     if (response.data.Status) {
  //       // Update the payment in the state
  //       setPayments((prevPayments) =>
  //         prevPayments.map((p) =>
  //           p.payId === payment.payId
  //             ? {
  //                 ...p,
  //                 received: !p.received,
  //               }
  //             : p
  //         )
  //       );

  //       // Trigger recalculation of payment type totals
  //       await fetchPaymentTypeTotals();
  //     } else {
  //       setAlert({
  //         show: true,
  //         title: "Error",
  //         message: response.data.Error || "Failed to update payment status",
  //         type: "error",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error toggling payment received status:", error);
  //     setAlert({
  //       show: true,
  //       title: "Error",
  //       message: "Failed to update payment status",
  //       type: "error",
  //     });
  //   }
  // };

  // Add this function near the other fetch functions
  const fetchPaymentTypeTotals = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/total-per-payment-type`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("response.data.Result", response.data.Result);

      if (response.data.Status) {
        setPaymentTypeTotals(response.data.Result);
      } else {
        console.error(
          "Error fetching payment type totals:",
          response.data.Error
        );
      }
    } catch (error) {
      console.error("Error fetching payment type totals:", error);
    }
  };

  // Add useEffect to fetch payment type totals
  useEffect(() => {
    fetchPaymentTypeTotals();
  }, []);

  // Add useEffect to refresh totals when payments are confirmed
  useEffect(() => {
    if (selectedPayments.length === 0) {
      fetchPaymentTypeTotals();
    }
  }, [selectedPayments]);

  // Add this function near the other payment handlers
  const handleConfirmPaymentReceipt = async () => {
    try {
      const token = localStorage.getItem("token");
      const userName = localStorage.getItem("userName");

      if (!userName) {
        setAlert({
          show: true,
          title: "Error",
          message: "Please log in again to continue",
          type: "error",
        });
        return;
      }

      if (!paymentTypeTotals || paymentTypeTotals.length === 0) {
        setAlert({
          show: true,
          title: "Error",
          message: "No payments to confirm",
          type: "error",
        });
        return;
      }

      const response = await axios.post(
        `${ServerIP}/auth/confirm-payment-receipt`,
        {
          payIds: selectedPayments,
          receivedBy: userName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        // Refresh the payments list and totals
        await fetchPayments();
        await fetchPaymentTypeTotals();

        // Clear selected payments
        setSelectedPayments([]);

        setAlert({
          show: true,
          title: "Success",
          message: response.data.Message,
          type: "alert",
        });
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to confirm payment receipts",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error confirming payment receipts:", error);
      setAlert({
        show: true,
        title: "Error",
        message:
          error.response?.data?.Error || "Failed to confirm payment receipts",
        type: "error",
      });
    }
  };

  // Add this to the payments table row
  const handlePaymentSelect = async (payment, checked) => {
    try {
      const response = await axios.post(
        `${ServerIP}/auth/toggle-payment-received`,
        {
          payId: payment.payId,
          received: checked ? 1 : 0,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.Status) {
        // Update the local state to reflect the new payment status
        setPayments((prevPayments) =>
          prevPayments.map((p) =>
            p.payId === payment.payId
              ? {
                  ...p,
                  received: checked ? 1 : 0,
                }
              : p
          )
        );

        // Update selected payments
        setSelectedPayments((prev) =>
          checked
            ? [...prev, payment.payId]
            : prev.filter((id) => id !== payment.payId)
        );

        // Refresh payment type totals
        await fetchPaymentTypeTotals();
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to update payment status",
          type: "alert",
        });
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update payment status",
        type: "alert",
      });
    }
  };

  // Add handler for includeReceived checkbox
  const handleIncludeReceivedChange = (e) => {
    setIncludeReceived(e.target.checked);
    setPaymentCurrentPage(1); // Reset to first page when toggling filter
  };

  // Add function to fetch checked payments
  const fetchCheckedPayments = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/checked-payments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.Status) {
        setSelectedPayments(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching checked payments:", error);
    }
  };

  // Update useEffect to fetch checked payments
  useEffect(() => {
    if (activeTab === "payments") {
      fetchCheckedPayments();
      fetchPaymentTypeTotals();
    }
  }, [activeTab]);

  return (
    <div className="payment-theme">
      <div className="payment-page-background px-5">
        <div className="payment-header d-flex justify-content-center">
          <h3>Receive Payment</h3>
        </div>

        {/* Tabs */}
        <div>
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "payments" ? "active" : ""
                }`}
                onClick={() => setActiveTab("payments")}
              >
                Payments
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "receive" ? "active" : ""
                }`}
                onClick={() => setActiveTab("receive")}
              >
                Orders
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          <div
            className={`tab-pane fade ${
              activeTab === "receive" ? "show active" : ""
            }`}
          >
            {/* Action Buttons and Search */}
            <div className="d-flex justify-content-between mb-3">
              <div className="d-flex gap-2">
                {/* <Button variant="add">New Payment (remove this)</Button> */}
              </div>
              <div className="search-container">
                <label htmlFor="paymentSearch" className="visually-hidden">
                  Search payments
                </label>
                <input
                  id="paymentSearch"
                  name="paymentSearch"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by ID, client, project, ordered by, DR#, INV#, OR#, sales, amount, ref..."
                  onChange={handleSearch}
                  value={displaySearchTerm}
                  style={{ width: "400px" }}
                  aria-label="Search payments"
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

            {/* Orders table */}
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
              <table className="table table-hover">
                <thead className="table table-head">
                  <tr>
                    <th
                      className="text-center"
                      onClick={() => handleSort("id")}
                      style={{ cursor: "pointer" }}
                    >
                      JO # {getSortIndicator("id")}
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
                    <th className="text-center">Order Ref</th>
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
                    <th className="text-center">Amount Paid</th>
                    <th className="text-center">OR#</th>
                    <th className="text-right">Balance</th>
                    <th className="text-center">Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate(`/dashboard/payment/view/${order.id}`)
                        }
                      >
                        {order.id}
                      </td>
                      <td
                        className="client-cell"
                        onClick={(e) => {
                          if (clientFilterRef.current) {
                            clientFilterRef.current.toggleFilterMenu(e);
                          }
                        }}
                        onMouseEnter={() => handleClientHover(order.clientId)}
                        onMouseLeave={handleClientLeave}
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
                      <td>{order.orderReference}</td>
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
                      <td className="text-center">
                        <span className={`status-badge ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{order.drnum || ""}</td>
                      <td>{order.invnum || ""}</td>
                      <td className="number_right">
                        {formatPeso(order.grandTotal)}
                      </td>
                      <td
                        className="number_right"
                        style={{ cursor: "pointer" }}
                        onDoubleClick={async () => {
                          try {
                            const response = await axios.post(
                              `${ServerIP}/auth/recalculate-paid-amount`,
                              { orderId: order.id }
                            );

                            if (response.data.Status) {
                              // Update the order in state
                              setOrders(
                                orders.map((o) =>
                                  o.id === order.id
                                    ? {
                                        ...o,
                                        amountPaid:
                                          response.data.Result.amountPaid,
                                      }
                                    : o
                                )
                              );

                              setAlert({
                                show: true,
                                title: "Success",
                                message: "Amount recalculated successfully",
                                type: "alert",
                                showOkButton: true,
                              });
                            }
                          } catch (error) {
                            console.error("Error recalculating amount:", error);
                            setAlert({
                              show: true,
                              title: "Error",
                              message: "Failed to recalculate amount",
                              type: "error",
                              showOkButton: true,
                            });
                          }
                        }}
                      >
                        {formatPeso(order.amountPaid)}
                      </td>
                      <td>{order.orNums || ""}</td>
                      <td className="text-right">
                        {(() => {
                          const balance =
                            order.grandTotal -
                            (order.amountPaid || 0) -
                            (orderPayments[order.id]?.payment || 0);
                          return balance > 0 ? formatPeso(balance) : "";
                        })()}
                      </td>
                      <td>
                        {order.datePaid
                          ? new Date(order.datePaid).toLocaleDateString()
                          : ""}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="table-info">
                    <td colSpan="8"></td>
                    <td className="text-right">
                      <div
                        className="position-relative"
                        onMouseOver={(e) => {
                          if (!canPost()) {
                            console.log("Showing tooltip");
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const message = getTooltipMessage();
                            // Estimate pixel width based on message length (roughly 8px per character)
                            const messageWidth = message.length * 10;
                            // Adjust x position based on message width
                            const xOffset = messageWidth / 2;

                            setTooltipPosition({
                              x: rect.left - xOffset,
                              y: rect.top + window.scrollY + 5,
                            });
                            setShowTooltip(true);
                          }
                        }}
                        onMouseLeave={() => setShowTooltip(false)}
                      ></div>
                    </td>
                    <td className="text-right">
                      <strong>Totals:</strong>
                    </td>
                    <td className="text-right">
                      <strong>
                        {(() => {
                          const total = Object.values(orderPayments).reduce(
                            (sum, p) => sum + (p.payment || 0),
                            0
                          );
                          return total > 0 ? formatPeso(total) : "";
                        })()}
                      </strong>
                    </td>
                    <td className="text-right">
                      <strong>
                        {(() => {
                          const total = Object.values(orderPayments).reduce(
                            (sum, p) => sum + (p.wtax || 0),
                            0
                          );
                          return total > 0 ? formatPeso(total) : "";
                        })()}
                      </strong>
                    </td>
                    <td className="text-right">
                      <strong>
                        {remainingAmount > 0 ? formatPeso(remainingAmount) : ""}
                      </strong>
                    </td>
                    <td colSpan="2"></td>
                  </tr>
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
                    "orderStatusFilter",
                    JSON.stringify(newStatuses)
                  );
                  fetchOrderData();
                }}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>

          {/* Payments Tab */}
          <div
            className={`tab-pane fade ${
              activeTab === "payments" ? "show active" : ""
            }`}
          >
            <div className="d-flex justify-content-between mb-3">
              <div className="d-flex gap-2 align-items-center">
                <Button
                  variant="add"
                  onClick={handleConfirmPaymentReceipt}
                  disabled={paymentTypeTotals.length === 0}
                >
                  Confirm Payment Receipt
                </Button>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="includeReceived"
                    checked={includeReceived}
                    onChange={handleIncludeReceivedChange}
                  />
                  <label className="form-check-label" htmlFor="includeReceived">
                    Include received
                  </label>
                </div>
              </div>
              <div className="search-container">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by payId, OR#, reference, transacted by..."
                  onChange={handlePaymentSearch}
                  value={paymentSearchTerm}
                  style={{ width: "400px" }}
                />
              </div>
            </div>

            {loading && (
              <div className="text-center my-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            <div className="table-responsive">
              {paymentTypeTotals.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">Received Payments Summary</h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped">
                        <thead>
                          <tr>
                            <th className="text-center">Payment Type</th>
                            <th className="text-center">Count</th>
                            <th className="text-center">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentTypeTotals.map((type) => (
                            <tr key={type.payType}>
                              <td className="text-center">{type.payType}</td>
                              <td className="text-center">{type.count}</td>
                              <td className="text-right">
                                {formatPeso(type.totalAmount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="table-primary">
                            <td className="text-center fw-bold">Total</td>
                            <td className="text-center fw-bold">
                              {paymentTypeTotals.reduce(
                                (sum, type) => sum + type.count,
                                0
                              )}
                            </td>
                            <td className="text-right fw-bold">
                              {formatPeso(
                                paymentTypeTotals.reduce(
                                  (sum, type) =>
                                    sum + parseFloat(type.totalAmount),
                                  0
                                )
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              <table className="table table-hover">
                <thead className="table table-head">
                  <tr>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("payId")}
                      style={{ cursor: "pointer" }}
                    >
                      Payment ID{" "}
                      {paymentSortConfig.key === "payId" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("payDate")}
                      style={{ cursor: "pointer" }}
                    >
                      Payment Date{" "}
                      {paymentSortConfig.key === "payDate" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("amount")}
                      style={{ cursor: "pointer" }}
                    >
                      Amount{" "}
                      {paymentSortConfig.key === "amount" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("received")}
                      style={{ cursor: "pointer" }}
                    >
                      Select{" "}
                      {paymentSortConfig.key === "received" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("payType")}
                      style={{ cursor: "pointer" }}
                    >
                      Type{" "}
                      {paymentSortConfig.key === "payType" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("ornum")}
                      style={{ cursor: "pointer" }}
                    >
                      OR#{" "}
                      {paymentSortConfig.key === "ornum" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("payReference")}
                      style={{ cursor: "pointer" }}
                    >
                      Reference{" "}
                      {paymentSortConfig.key === "payReference" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("transactedBy")}
                      style={{ cursor: "pointer" }}
                    >
                      Transacted By{" "}
                      {paymentSortConfig.key === "transactedBy" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("postedDate")}
                      style={{ cursor: "pointer" }}
                    >
                      Posted Date{" "}
                      {paymentSortConfig.key === "postedDate" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="text-center">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold"
                        onClick={() => handlePaymentSort("remittedDate")}
                      >
                        Remitted Date{" "}
                        {paymentSortConfig.key === "remittedDate" &&
                          (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                      </button>
                      <div className="d-flex align-items-center gap-1 mt-1">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={remittedDateFilter}
                          onChange={handleRemittedDateFilterChange}
                        />
                        {remittedDateFilter && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={clearRemittedDateFilter}
                            title="Clear remitted date filter"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("receivedBy")}
                      style={{ cursor: "pointer" }}
                    >
                      Received By{" "}
                      {paymentSortConfig.key === "receivedBy" &&
                        (paymentSortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handlePaymentSort("receivedDate")}
                      style={{ cursor: "pointer" }}
                    >
                      Received Date{" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.payId}>
                      <td className="text-center">{payment.payId}</td>
                      <td className="text-center">
                        {payment.payDate ? formatDate(payment.payDate) : ""}
                      </td>
                      <td className="text-right">
                        {formatPeso(payment.amount)}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={payment.received === 1}
                          onChange={(e) =>
                            handlePaymentSelect(payment, e.target.checked)
                          }
                          disabled={payment.receivedBy !== null}
                        />
                      </td>
                      <td className="text-center">{payment.payType}</td>
                      <td className="text-center">{payment.ornum}</td>
                      <td className="text-center">
                        {payment.payReference || ""}
                      </td>
                      <td className="text-center">{payment.transactedBy}</td>
                      <td className="text-center">
                        {payment.postedDate
                          ? formatDateTime(payment.postedDate)
                          : ""}
                      </td>
                      <td className="text-center">
                        {payment.remittedDate
                          ? formatDateTime(payment.remittedDate)
                          : ""}
                      </td>
                      <td className="text-center">
                        {payment.receivedBy || "-"}
                      </td>
                      <td className="text-center">
                        {payment.receivedDate
                          ? formatDateTime(payment.receivedDate)
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <DisplayPage
                recordsPerPage={recordsPerPage}
                setRecordsPerPage={setRecordsPerPage}
                currentPage={paymentCurrentPage}
                totalCount={paymentTotalCount}
                setCurrentPage={setPaymentCurrentPage}
              />
              <Pagination
                currentPage={paymentCurrentPage}
                totalPages={paymentTotalPages}
                onPageChange={setPaymentCurrentPage}
              />
            </div>
          </div>
        </div>
      </div>

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, show: false })}
        onConfirm={alert.onConfirm}
      />

      {/* Client Info Modal */}
      <ViewCustomerInfo
        show={showClientInfo}
        onClose={() => setShowClientInfo(false)}
        clientId={selectedClientId}
      />
    </div>
  );
}

export default ReceivePayment;
