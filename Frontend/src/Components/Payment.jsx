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

  // Keep the debounced search handler
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 500),
    []
  );

  // Update handleSearch to properly clear client search and trigger fetch
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();

    // Clear client name search when using the search bar
    setSearchClientName("");
    setPaymentInfo((prev) => ({
      ...prev,
      clientName: "",
    }));

    // Set search term immediately for the first character
    setSearchTerm(term);
    setCurrentPage(1);

    // Then use debounced search for subsequent changes
    if (term.length > 1) {
      debouncedSearch(term);
    } else {
      // For first character or empty search, trigger fetch immediately
      fetchOrders();
    }
  };

  // Update useEffect to handle both search types
  useEffect(() => {
    if (searchClientName.trim()) {
      // Don't fetch if we're doing a client search
      return;
    }

    console.log("Effect triggered with selectedStatuses:", selectedStatuses);
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
    // For Tab key, let the default behavior happen and perform search
    if (e.type === "keydown" && e.key === "Tab") {
      const searchBar = document.querySelector(
        'input[type="text"][placeholder*="Search by ID"]'
      );
      if (searchBar) {
        searchBar.value = "";
      }
      performClientSearch();
      return;
    }

    // For Enter key, prevent default and manually move focus
    if (e.type === "keydown" && e.key === "Enter") {
      e.preventDefault();
      const ornumInput = document.querySelector(
        'input[placeholder="Enter OR#"]'
      );
      if (ornumInput) {
        ornumInput.focus();
      }
      performClientSearch();
      return;
    }

    // For blur event
    if (e.type === "blur") {
      performClientSearch();
    }
  };

  // Separate the search logic into its own function
  const performClientSearch = async () => {
    if (!searchClientName.trim()) {
      fetchOrders();
      return;
    }

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

  // Add useEffect to fetch WTax types and VAT rate
  useEffect(() => {
    const fetchWtaxAndVat = async () => {
      try {
        const [wtaxResponse, vatResponse] = await Promise.all([
          axios.get(`${ServerIP}/auth/wtax-types`),
          axios.get(`${ServerIP}/auth/jomcontrol/VAT`),
        ]);

        console.log("WTax Response:", wtaxResponse.data);
        if (wtaxResponse.data.Status) {
          setWtaxTypes(wtaxResponse.data.Result);
          // Set N2 as default WTax type
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
      } catch (err) {
        console.error("Error fetching WTax types and VAT:", err);
      }
    };
    fetchWtaxAndVat();
  }, []);

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
        fetchOrders();
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
        // Optionally clear the OR# input
        // setPaymentInfo(prev => ({
        //   ...prev,
        //   ornum: ''
        // }));
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
                  onBlur={handleClientSearch}
                  placeholder="Enter client name"
                  tabIndex="3"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label>OR#</label>
                <input
                  type="text"
                  className="form-control"
                  value={paymentInfo.ornum}
                  onChange={(e) =>
                    handlePaymentInfoChange("ornum", e.target.value)
                  }
                  onBlur={(e) => checkORNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      checkORNumber(e.target.value);
                    }
                  }}
                  placeholder="Enter OR#"
                  tabIndex="4"
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
                  tabIndex="5"
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
                  tabIndex="6"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add WTax dropdown next to search bar */}
        <div className="d-flex justify-content-between mb-3">
          <input
            type="text"
            className="form-control form-control-sm me-3"
            placeholder="Search by ID, client..."
            onChange={handleSearch}
            style={{ width: "400px" }}
            tabIndex="7"
          />
          <select
            className="form-control form-control-sm"
            style={{ width: "250px" }}
            value={selectedWtax?.WTax}
            tabIndex="6"
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
                    <input
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
                  <td>{order.ornum || ""}</td>
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
