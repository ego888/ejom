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
import ModalAlert from "../Components/UI/ModalAlert";
import Modal from "./UI/Modal";

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
    ornum: "",
  });
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [checkPay, setCheckPay] = useState(new Set());
  const [orderPayments, setOrderPayments] = useState({});
  const [wtaxTypes, setWtaxTypes] = useState([]);
  const [selectedWtax, setSelectedWtax] = useState(null);
  const [vatRate, setVatRate] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "",
    onConfirm: null,
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [initialLoad, setInitialLoad] = useState(true);

  // 1. Move fetchOrderData outside useEffect
  const fetchOrderData = async () => {
    console.log("fetchOrderData function called");
    setLoading(true);
    try {
      // Read statuses directly from localStorage like Orders.jsx
      const activeStatuses = JSON.parse(
        localStorage.getItem("orderStatusFilter") || "[]"
      );
      console.log("Fetching with statuses:", activeStatuses);

      const endpoint = searchClientName.trim()
        ? `${ServerIP}/auth/search-orders-by-client`
        : `${ServerIP}/auth/orders`;

      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        statuses: activeStatuses.join(","), // Use activeStatuses instead of selectedStatuses
        sales: selectedSales.length ? selectedSales.join(",") : undefined,
        ...(searchClientName.trim() && { clientName: searchClientName }),
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
      };

      console.log("Endpoint:", endpoint);
      console.log("Params:", params);
      const response = await axios.get(endpoint, { params });

      if (response.data.Status) {
        setOrders(response.data.Result.orders);
        setTotalCount(response.data.Result.total);
        setTotalPages(response.data.Result.totalPages);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setTotalCount(0);
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
          wtaxResponse,
          paymentTypesResponse,
          clientResponse,
          salesResponse,
          vatResponse,
        ] = await Promise.all([
          axios.get(`${ServerIP}/auth/order-statuses`),
          axios.get(`${ServerIP}/auth/wtax-types`),
          axios.get(`${ServerIP}/auth/payment-types`),
          axios.get(`${ServerIP}/auth/clients`),
          axios.get(`${ServerIP}/auth/sales_employees`),
          axios.get(`${ServerIP}/auth/jomcontrol/VAT`),
        ]);

        // Handle all responses
        if (statusResponse.data.Status) {
          const sortedStatuses = statusResponse.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);

          // Set initial prod statuses
          const prodStatuses = sortedStatuses
            .slice(2, 6)
            .map((s) => s.statusId);
          setSelectedStatuses(prodStatuses);
          setIsProdChecked(true);
          localStorage.setItem(
            "orderStatusFilters",
            JSON.stringify(prodStatuses)
          );
        }

        if (wtaxResponse.data.Status) {
          setWtaxTypes(wtaxResponse.data.Result);
          // Set V2 as default WTax type
          const defaultWTax = wtaxResponse.data.Result.find(
            (wt) => wt.WTax === "V2"
          );
          if (defaultWTax) {
            setSelectedWtax(defaultWTax);
          }
        }
        if (vatResponse.data.Status) {
          setVatRate(vatResponse.data.Result.VAT);
        }
        if (paymentTypesResponse.data.Status)
          setPaymentTypes(paymentTypesResponse.data.Result);
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

  // Update handleSearch to use current term directly
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    console.log("Search term:", term);

    // Clear client name search when using the search bar
    setSearchClientName("");
    setPaymentInfo((prev) => ({
      ...prev,
      clientName: "",
    }));

    // Update search term state
    setSearchTerm(term);
    setCurrentPage(1);

    // Call fetchOrderData with the current term directly
    const fetchWithTerm = async () => {
      setLoading(true);
      try {
        const endpoint = searchClientName.trim()
          ? `${ServerIP}/auth/search-orders-by-client`
          : `${ServerIP}/auth/orders`;

        const params = {
          page: currentPage,
          limit: recordsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
          statuses: selectedStatuses.join(","),
          sales: selectedSales.length ? selectedSales.join(",") : undefined,
          ...(searchClientName.trim() && { clientName: searchClientName }),
          search: term, // Use current term directly instead of searchTerm state
        };

        console.log("Searching with term:", term);
        const response = await axios.get(endpoint, { params });

        if (response.data.Status) {
          setOrders(response.data.Result.orders);
          setTotalCount(response.data.Result.total);
          setTotalPages(response.data.Result.totalPages);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchWithTerm();
  };

  // Add a new useEffect for other changes (not search)
  useEffect(() => {
    fetchOrderData();
  }, [
    currentPage,
    recordsPerPage,
    sortConfig,
    selectedSales,
    // searchTerm removed from dependencies
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

  // Status filter handlers
  // const handleStatusFilter = (statusId) => {
  //   setSelectedStatuses((prev) => {
  //     let newStatuses;
  //     if (prev.includes(statusId)) {
  //       newStatuses = prev.filter((s) => s !== statusId);
  //     } else {
  //       newStatuses = [...prev, statusId];
  //     }
  //     console.log("New statuses after toggle:", newStatuses); // Debugging log
  //     // Update Prod checkbox state
  //     const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
  //     const selectedProdStatuses = newStatuses.filter((s) =>
  //       prodStatuses.includes(s)
  //     );
  //     console.log("Prod statuses:", prodStatuses); // Debugging log
  //     console.log("Selected prod statuses:", selectedProdStatuses); // Debugging log
  //     setIsProdChecked(selectedProdStatuses.length === prodStatuses.length);

  //     // Update All checkbox state
  //     setIsAllChecked(newStatuses.length === statusOptions.length);

  //     // Save to localStorage
  //     localStorage.setItem("orderStatusFilters", JSON.stringify(newStatuses));
  //     return newStatuses;
  //   });
  //   setCurrentPage(1);
  // };

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

  // Handle records per page change
  // const handleRecordsPerPageChange = (e) => {
  //   setRecordsPerPage(Number(e.target.value));
  //   setCurrentPage(1); // Reset to first page
  // };

  // const isProdIndeterminate = () => {
  //   const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
  //   const selectedProdStatuses = selectedStatuses.filter((s) =>
  //     prodStatuses.includes(s)
  //   );
  //   return (
  //     selectedProdStatuses.length > 0 &&
  //     selectedProdStatuses.length < prodStatuses.length
  //   );
  // };

  // const handleProdCheckbox = (e) => {
  //   const prodStatuses = statusOptions.slice(2, 6).map((s) => s.statusId);
  //   let newStatuses;
  //   if (e.target.checked) {
  //     newStatuses = [...new Set([...selectedStatuses, ...prodStatuses])];
  //   } else {
  //     newStatuses = selectedStatuses.filter((s) => !prodStatuses.includes(s));
  //   }

  //   setSelectedStatuses(newStatuses);
  //   setIsProdChecked(e.target.checked);
  //   setIsAllChecked(newStatuses.length === statusOptions.length);

  //   // Save to localStorage
  //   localStorage.setItem("orderStatusFilters", JSON.stringify(newStatuses));
  // };

  // const isAllIndeterminate = () => {
  //   return (
  //     selectedStatuses.length > 0 &&
  //     selectedStatuses.length < statusOptions.length
  //   );
  // };

  // const handleAllCheckbox = (e) => {
  //   let newStatuses = [];
  //   if (e.target.checked) {
  //     newStatuses = statusOptions.map((s) => s.statusId);
  //   }
  //   setSelectedStatuses(newStatuses);
  //   setIsAllChecked(e.target.checked);
  //   setIsProdChecked(e.target.checked);

  //   // Save to localStorage
  //   localStorage.setItem("paymentStatusFilters", JSON.stringify(newStatuses));
  // };

  // Add a cleanup effect to save the page when unmounting
  // useEffect(() => {
  //   return () => {
  //     console.log("currentPage 1", currentPage);
  //     localStorage.setItem("ordersListPage", currentPage.toString());
  //   };
  // }, [currentPage]);

  // Separate the search logic into its own function
  const handleClientSearch = async (e) => {
    if (e.type === "keydown" && e.key !== "Enter") return; // Prevent fetch on every key press
    if (e.type === "blur" && searchClientName.trim() === "") return; // Prevent empty search

    fetchOrderData();

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (selectedStatuses.length === 0) {
        setOrders([]);
        setTotalCount(0);
        setTotalPages(0);
        setLoading(false);
        return;
      }

      console.log("Fetching orders by client:", searchClientName);
      const response = await axios.get(
        `${ServerIP}/auth/search-orders-by-client`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            clientName: searchClientName,
            page: 1,
            limit: recordsPerPage,
            sortBy: sortConfig.key,
            sortDirection: sortConfig.direction,
            statuses: selectedStatuses.join(","),
            sales: selectedSales.length ? selectedSales.join(",") : undefined,
          },
        }
      );

      console.log("RESULT", response);
      if (response.data.Status) {
        setOrders(response.data.Result.orders || []);
        setTotalCount(response.data.Result.total || 0);
        setTotalPages(response.data.Result.totalPages || 0);
        setPaymentInfo((prev) => ({
          ...prev,
          clientName: searchClientName,
        }));
      }
      console.log("RESULT 2:", response);
    } catch (error) {
      console.error("Error searching orders by client:", error);
      setOrders([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to focus on client name input when component mounts
  useEffect(() => {
    const clientNameInput = document.querySelector('input[name="clientName"]');
    if (clientNameInput) {
      clientNameInput.focus();
    }
  }, []);

  const handlePaymentInfoChange = (field, value) => {
    setPaymentInfo((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Update remaining amount when total amount changes
    if (field === "amount") {
      setRemainingAmount(Number(value));
      // Don't reset payments anymore
    }
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

  // Update handlePayCheck to include WTax calculation
  const handlePayCheck = (orderId, orderAmount) => {
    if (!canEditPayments()) return;

    const newCheckPay = new Set(checkPay);
    const newOrderPayments = { ...orderPayments };

    // Calculate current total payments
    const currentTotal = Object.values(newOrderPayments).reduce(
      (sum, p) => sum + (p.payment || 0),
      0
    );

    if (newCheckPay.has(orderId)) {
      // Uncheck: Remove payment and add amount back to remaining
      newCheckPay.delete(orderId);
      const removedPayment = newOrderPayments[orderId]?.payment || 0;
      setRemainingAmount((prev) => prev + removedPayment);
      delete newOrderPayments[orderId];
    } else {
      // Check: Calculate and apply new payment
      const availableAmount = Math.min(remainingAmount, orderAmount);
      console.log("Available Amount 1:", availableAmount);
      console.log("Order Amount 1:", orderAmount);
      console.log("Remaining Amount 1:", remainingAmount);
      if (availableAmount > 0) {
        let wtaxAmount = 0;
        let paymentAmount = availableAmount;

        // Calculate WTax if we have the full amount for the order
        //        if (selectedWtax && availableAmount >= orderAmount) {
        console.log("Selected WTax:", selectedWtax);
        if (selectedWtax.withVAT === 1) {
          const baseAmount = orderAmount / (1 + vatRate / 100);
          wtaxAmount =
            Math.round(baseAmount * (selectedWtax.taxRate / 100) * 100) / 100;
          // Adjust payment amount by subtracting WTax
          console.log("WTax Amount:", wtaxAmount);
          if (availableAmount >= orderAmount) {
            paymentAmount = orderAmount - wtaxAmount;
          } else {
            paymentAmount = availableAmount;
          }
          console.log("Available Amount:", availableAmount);
          console.log("Order Amount:", orderAmount);
          console.log("Payment Amount:", paymentAmount);
        } else {
          wtaxAmount =
            Math.round(orderAmount * (selectedWtax.taxRate / 100) * 100) / 100;
        }

        // Ensure we don't exceed the input amount
        if (currentTotal + paymentAmount <= paymentInfo.amount) {
          newCheckPay.add(orderId);
          newOrderPayments[orderId] = {
            payment: paymentAmount,
            wtax: wtaxAmount,
          };
          // Update remaining amount based on payment only
          setRemainingAmount((prev) => prev - paymentAmount);
        }
      }
    }

    setCheckPay(newCheckPay);
    setOrderPayments(newOrderPayments);
  };

  // Also update the WTax change handler
  useEffect(() => {
    if (selectedWtax && checkPay.size > 0) {
      const newOrderPayments = { ...orderPayments };
      let totalRemainingAmount = paymentInfo.amount;

      // Recalculate all payments
      checkPay.forEach((orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;

        const orderAmount = order.grandTotal - (order.amountPaid || 0);
        let wtaxAmount = 0;
        let paymentAmount = orderAmount;

        // Calculate WTax and adjust payment
        if (orderAmount <= totalRemainingAmount) {
          const baseAmount =
            selectedWtax.withVAT === 1
              ? orderAmount / (1 + vatRate / 100)
              : orderAmount;
          wtaxAmount =
            Math.round(baseAmount * (selectedWtax.taxRate / 100) * 100) / 100;
          paymentAmount = orderAmount - wtaxAmount;
        } else {
          paymentAmount = totalRemainingAmount;
        }

        newOrderPayments[orderId] = {
          payment: paymentAmount,
          wtax: wtaxAmount,
        };
        totalRemainingAmount -= paymentAmount;
      });

      setOrderPayments(newOrderPayments);
      setRemainingAmount(totalRemainingAmount);
    }
  }, [selectedWtax, vatRate, orders, paymentInfo.amount]);

  // Add handler for payment/wtax changes
  const handlePaymentChange = (orderId, field, value) => {
    const numValue = Number(value);
    const newOrderPayments = { ...orderPayments };
    const oldPayment = newOrderPayments[orderId]?.payment || 0;

    if (field === "payment") {
      // Calculate max allowed payment
      const maxPayment = remainingAmount + oldPayment;
      const payment = Math.min(numValue, maxPayment);

      newOrderPayments[orderId] = {
        ...newOrderPayments[orderId],
        payment,
      };
      setRemainingAmount(maxPayment - payment);
    } else if (field === "wtax") {
      newOrderPayments[orderId] = {
        ...newOrderPayments[orderId],
        wtax: numValue,
      };
    }

    setOrderPayments(newOrderPayments);
  };

  // Add this helper function for currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
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

  // Update handlePostPayment to validate OR# first
  const handlePostPayment = async () => {
    // Validate OR#
    if (!paymentInfo.ornum.trim()) {
      setModalConfig({
        title: "Validation Error",
        message: "Please enter OR#",
        type: "error",
        showCancelButton: false,
        onConfirm: () => setShowModal(false),
      });
      setShowModal(true);
      return;
    }
    // Check if total applied matches header amount
    const totalApplied = Object.values(orderPayments).reduce(
      (sum, p) => sum + (p.payment || 0),
      0
    );
    if (Number(totalApplied) !== Number(paymentInfo.amount)) {
      setModalConfig({
        title: "Payment Amount Mismatch",
        message: `The total applied amount (${formatCurrency(
          totalApplied
        )}) does not match the payment amount (${formatCurrency(
          paymentInfo.amount
        )}). Do you want to proceed?`,
        type: "warning",
        showCancelButton: true,
        onConfirm: () => postPaymentToServer(),
        onCancel: () => setShowModal(false),
      });
      setShowModal(true);
      return;
    }
    await postPaymentToServer();
  };

  // Function to post payment to server
  const postPaymentToServer = async () => {
    try {
      const payload = {
        payment: {
          amount: Number(paymentInfo.amount),
          payType: paymentInfo.payType,
          payReference: paymentInfo.payReference,
          payDate: paymentInfo.payDate,
          ornum: paymentInfo.ornum,
          transactedBy: localStorage.getItem("userName"),
        },
        allocations: Object.entries(orderPayments).map(
          ([orderId, details]) => ({
            orderId: Number(orderId),
            amountApplied: details.payment,
          })
        ),
      };

      const response = await axios.post(
        `${ServerIP}/auth/post-payment`,
        payload
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          title: "Success",
          message: "Payment posted successfully",
          type: "alert",
          showOkButton: true,
        });

        // Reset payment-related states
        setOrderPayments({});
        setRemainingAmount(0);
        // Reset header amount to 0
        setPaymentInfo((prev) => ({
          ...prev,
          amount: "", // Empty string for input field
        }));
        console.log("fetchOrder from postPaymentToServer");
        fetchOrderData();
      }
    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = "Failed to post payment";

      if (error.code === "ERR_CONNECTION_REFUSED") {
        errorMessage =
          "Unable to connect to server. Please check if the server is running.";
      } else if (error.response?.data?.Error) {
        errorMessage = error.response.data.Error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setAlert({
        show: true,
        title: "Error",
        message: errorMessage,
        type: "error",
        showOkButton: true,
      });
    }
  };

  // Add function to check OR#
  const checkORNumber = async (ornum) => {
    if (!ornum.trim()) return;

    try {
      const response = await axios.get(`${ServerIP}/auth/check-ornum`, {
        params: { ornum },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.data.exists) {
        setAlert({
          show: true,
          title: "Warning",
          message: `OR# ${ornum} already exists`,
          type: "alert",
          showOkButton: true,
        });

        document.querySelector('input[placeholder="Enter amount"]').focus();
      }
    } catch (error) {
      console.error("Error checking OR#:", error);
    }
  };

  return (
    <div className="payment-theme">
      <div className="payment-page-background px-5">
        <div className="payment-header d-flex justify-content-center">
          <h3>Payment Processing</h3>
        </div>

        {/* Payment Info Header */}
        <div className="payment-info-header mb-4">
          <div className="row">
            <div className="col-md-2">
              <div className="form-group">
                <label htmlFor="payment-date">Payment Date</label>
                <input
                  id="payment-date"
                  type="date"
                  className="form-control"
                  value={paymentInfo.payDate}
                  onChange={(e) =>
                    handlePaymentInfoChange("payDate", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="col-md-1">
              <div className="form-group">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  className="form-control"
                  value={paymentInfo.payType}
                  onChange={(e) =>
                    handlePaymentInfoChange("payType", e.target.value)
                  }
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
                <label htmlFor="client">Client</label>
                <input
                  id="client"
                  type="text"
                  name="clientName"
                  className="form-control"
                  value={searchClientName}
                  onChange={(e) => setSearchClientName(e.target.value)}
                  onKeyDown={handleClientSearch}
                  onBlur={handleClientSearch}
                  placeholder="Enter client name"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label htmlFor="ornum">OR#</label>
                <input
                  id="ornum"
                  type="text"
                  className="form-control"
                  value={paymentInfo.ornum}
                  onChange={(e) =>
                    handlePaymentInfoChange("ornum", e.target.value)
                  }
                  onBlur={(e) => checkORNumber(e.target.value)}
                  placeholder="Enter OR#"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  type="number"
                  className="form-control"
                  value={paymentInfo.amount}
                  onChange={(e) =>
                    handlePaymentInfoChange("amount", e.target.value)
                  }
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label htmlFor="reference">Reference</label>
                <input
                  id="reference"
                  type="text"
                  className="form-control"
                  value={paymentInfo.payReference}
                  onChange={(e) =>
                    handlePaymentInfoChange("payReference", e.target.value)
                  }
                  placeholder="Enter reference"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add WTax dropdown next to search bar */}
        <div className="d-flex justify-content-between mb-3">
          <input
            id="search-vat"
            type="text"
            className="form-control form-control-sm me-3"
            placeholder="Search by ID, client..."
            onChange={handleSearch}
            style={{ width: "400px" }}
          />
          <select
            id="vat-select"
            className="form-control form-control-sm"
            style={{ width: "250px" }}
            value={selectedWtax?.WTax}
            onChange={(e) => {
              console.log("Selected value:", e.target.value);
              console.log("WTax types:", wtaxTypes);
              const selected = wtaxTypes.find((w) => w.WTax === e.target.value);
              console.log("Found WTax:", selected);
              setSelectedWtax(selected);

              // Recalculate WTax for all checked orders when WTax type changes
              if (selected) {
                const newOrderPayments = { ...orderPayments };
                checkPay.forEach((orderId) => {
                  const payment = newOrderPayments[orderId]?.payment || 0;
                  const baseAmount =
                    selected.withVAT === 1
                      ? payment / (1 + vatRate / 100)
                      : payment;
                  const wtaxAmount =
                    Math.round(baseAmount * (selected.taxRate / 100) * 100) /
                    100;

                  newOrderPayments[orderId] = {
                    ...newOrderPayments[orderId],
                    wtax: wtaxAmount,
                  };
                });
                setOrderPayments(newOrderPayments);
              }
            }}
          >
            <option value="">Select WTax Type</option>
            {wtaxTypes.map((wt) => (
              <option key={wt.WTax} value={wt.WTax}>
                {`${wt.WTax} - ${wt.Description}`}
              </option>
            ))}
          </select>
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
          <table className="table table-hover">
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
                <th className="text-center">Pay</th>
                <th className="text-right">Payment</th>
                <th className="text-right">WTax</th>
                <th className="text-right">Balance</th>
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
                                    amountPaid: response.data.Result.amountPaid,
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
                    {order.amountPaid
                      ? `₱${order.amountPaid.toLocaleString()}`
                      : ""}
                  </td>
                  <td className="text-center">
                    <div className="checkbox-container">
                      <label
                        htmlFor={`pay-check-${order.id}`}
                        className="visually-hidden"
                      >
                        Select order {order.id} for payment
                      </label>
                      <input
                        id={`pay-check-${order.id}`}
                        type="checkbox"
                        checked={checkPay.has(order.id)}
                        onChange={() =>
                          handlePayCheck(
                            order.id,
                            order.grandTotal - (order.amountPaid || 0)
                          )
                        }
                        disabled={
                          !canEditPayments() ||
                          (remainingAmount <= 0 && !checkPay.has(order.id)) ||
                          order.amountPaid >= order.grandTotal
                        }
                      />
                    </div>
                  </td>
                  <td className="text-right">
                    {canEditPayments() && checkPay.has(order.id) ? (
                      <input
                        type="number"
                        className="form-control form-control-sm text-right"
                        value={orderPayments[order.id]?.payment || 0}
                        onChange={(e) =>
                          handlePaymentChange(
                            order.id,
                            "payment",
                            e.target.value
                          )
                        }
                        min="0"
                        max={order.grandTotal - (order.amountPaid || 0)}
                      />
                    ) : (
                      formatCurrency(orderPayments[order.id]?.payment || 0)
                    )}
                  </td>
                  <td className="text-right">
                    {canEditPayments() && checkPay.has(order.id) ? (
                      <input
                        type="number"
                        className="form-control form-control-sm text-right"
                        value={orderPayments[order.id]?.wtax || 0}
                        onChange={(e) =>
                          handlePaymentChange(order.id, "wtax", e.target.value)
                        }
                        min="0"
                      />
                    ) : (
                      formatCurrency(orderPayments[order.id]?.wtax || 0)
                    )}
                  </td>
                  <td className="text-right">
                    {formatCurrency(
                      order.grandTotal -
                        (order.amountPaid || 0) -
                        (orderPayments[order.id]?.payment || 0)
                    )}
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
                <td colSpan="11"></td>
                <td className="text-right">
                  <div
                    className="position-relative"
                    onMouseOver={(e) => {
                      if (!canPost()) {
                        console.log("Showing tooltip");
                        const rect = e.currentTarget.getBoundingClientRect();
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
                  >
                    <Button
                      variant="save"
                      size="sm"
                      onClick={handlePostPayment}
                      disabled={!canPost()}
                    >
                      Post Payment
                    </Button>
                  </div>
                </td>
                <td className="text-right">
                  <strong>Totals:</strong>
                </td>
                <td className="text-right">
                  <strong>
                    {formatCurrency(
                      Object.values(orderPayments).reduce(
                        (sum, p) => sum + (p.payment || 0),
                        0
                      )
                    )}
                  </strong>
                </td>
                <td className="text-right">
                  <strong>
                    {formatCurrency(
                      Object.values(orderPayments).reduce(
                        (sum, p) => sum + (p.wtax || 0),
                        0
                      )
                    )}
                  </strong>
                </td>
                <td className="text-right">
                  <strong>{formatCurrency(remainingAmount)}</strong>
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
      <Modal
        variant="tooltip"
        show={showTooltip && !canPost()}
        position={tooltipPosition}
      >
        <div className="text-center">{getTooltipMessage()}</div>
      </Modal>
    </div>
  );
}

export default Prod;
