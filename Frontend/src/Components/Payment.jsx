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
import { formatPeso, formatPesoZ, formatDate } from "../utils/orderUtils";
import ModalAlert from "../Components/UI/ModalAlert";
import Modal from "./UI/Modal";
import PaymentAllocationModal from "./PaymentAllocationModal";
import RemitModal from "./RemitModal";
import ViewCustomerInfo from "./UI/ViewCustomerInfo";
import InvoiceDetailsModal from "./UI/InvoiceDetailsModal";

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
  const [isProdChecked, setIsProdChecked] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [hasClientFilter, setHasClientFilter] = useState(false);
  const [hasSalesFilter, setHasSalesFilter] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const salesFilterRef = useRef(null);
  const clientFilterRef = useRef(null);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState({
    clientName: "",
    payDate: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
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
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [tempPayId, setTempPayId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [amount, setAmount] = useState("");
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem("paymentSearchTerm") || "";
  });
  const [displaySearchTerm, setDisplaySearchTerm] = useState(() => {
    return localStorage.getItem("paymentSearchTerm") || "";
  });
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const hoverTimerRef = useRef(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [clickTimer, setClickTimer] = useState(null);
  const [allocationCount, setAllocationCount] = useState(0);
  const [allocatedAmount, setAllocatedAmount] = useState(0);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      // Only reset page if this is a new search, not a restore from localStorage
      if (term !== localStorage.getItem("paymentSearchTerm")) {
        setCurrentPage(1);
      }
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

  // Add useEffect to sync state with localStorage on mount
  useEffect(() => {
    const savedPage = parseInt(localStorage.getItem("ordersListPage")) || 1;
    const savedSort = localStorage.getItem("ordersSortConfig");
    const savedSearch = localStorage.getItem("paymentSearchTerm") || "";

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
  }, []);

  // Update fetchOrderData to use new endpoint
  const fetchOrderData = async () => {
    try {
      console.log("RUN fetchOrderData");
      console.trace("TRACE fetchOrderData");
      setLoading(true);
      const params = {
        page: currentPage,
        limit: recordsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        statuses: selectedStatuses.join(","),
        sales: selectedSales.join(","),
        clients: selectedClients.join(","),
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await axios.get(
        `${ServerIP}/auth/get-order-tempPaymentAllocation`,
        {
          params,
        }
      );

      if (response.data.Status) {
        setOrders(response.data.Result.orders);
        setTotalPages(response.data.Result.totalPages);
        setTotalCount(response.data.Result.total);

        // Get total allocated amount if we have a tempPayId
        if (tempPayId) {
          const totalAllocated = await getTotalAllocated(tempPayId);
          setRemainingAmount(paymentInfo.amount - totalAllocated);
        }

        // Update payment states based on server data
        const newOrderPayments = {};
        const newCheckPay = new Set();
        let hasTempPayments = false;

        response.data.Result.orders.forEach((order) => {
          if (order.tempPayment && order.tempPaymentOrderId === order.id) {
            hasTempPayments = true;
            newOrderPayments[order.id] = {
              payment: order.tempPayment,
              wtax: 0, // WTax will be calculated when needed
            };
            newCheckPay.add(order.id);
          }
        });

        // Only update payment states if we found temp payments
        if (hasTempPayments) {
          setOrderPayments(newOrderPayments);
          setCheckPay(newCheckPay);
        } else {
          // Clear payment states if no temp payments found
          setOrderPayments({});
          setCheckPay(new Set());
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      handleApiError(error);
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

          // Only set initial prod statuses if no saved filters exist
          const savedFilters = localStorage.getItem("orderStatusFilter");
          if (!savedFilters) {
            const prodStatuses = sortedStatuses
              .slice(2, 6)
              .map((s) => s.statusId);
            setSelectedStatuses(prodStatuses);
            setIsProdChecked(true);
            localStorage.setItem(
              "orderStatusFilter",
              JSON.stringify(prodStatuses)
            );
          }
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
          setVatRate(vatResponse.data.Result.vatPercent);
        }
        if (paymentTypesResponse.data.Status)
          setPaymentTypes(paymentTypesResponse.data.Result);
        if (clientResponse.data.Status)
          setClientList(clientResponse.data.Result);
        if (salesResponse.data.Status)
          setSalesEmployees(salesResponse.data.Result);

        console.log("FINISH initializeComponent");
        // Set initialLoad to false before fetching data
        setInitialLoad(false);
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
    // Skip the initial fetch since it's handled by initializeComponent
    if (initialLoad) {
      return;
    }
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

  // Update handleSort to preserve page number
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    // Remove the page reset
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

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
      localStorage.setItem("ordersListPage", "1");
    }
  }, [totalPages, currentPage]);

  // Modify the page change handler
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    console.log("pageNumber 2", pageNumber);
    localStorage.setItem("ordersListPage", pageNumber.toString());
  };

  // Update handleClientSearch to preserve page number
  const handleClientSearch = async (e) => {
    const value = e.target.value.trim();

    // Only run if value is different from current
    if (value && value !== paymentInfo.clientName) {
      setPaymentInfo((prev) => ({
        ...prev,
        clientName: value,
      }));

      await fetchOrderData();
    }
  };

  // Add useEffect to focus on client name input when component mounts
  useEffect(() => {
    const clientNameInput = document.querySelector('input[name="clientName"]');
    if (clientNameInput) {
      clientNameInput.focus();
    }
  }, []);

  // Add debounced save function
  const debouncedSavePayment = useCallback(
    debounce(async (paymentData) => {
      try {
        // Only save if we have all required fields
        if (
          paymentData.payDate &&
          paymentData.payType &&
          paymentData.amount > 0 &&
          paymentData.transactedBy
        ) {
          const response = await axios.post(
            `${ServerIP}/auth/save-temp-payment`,
            {
              payment: paymentData,
            }
          );

          if (response.data.Status) {
            setTempPayId(response.data.Result.payId);
            setPaymentInfo((prev) => ({
              ...prev,
              payId: response.data.Result.payId,
            }));
          }
        }
      } catch (error) {
        console.error("Error saving temp payment:", error);
      }
    }, 1000),
    []
  );

  const handlePaymentInfoChange = (field, value) => {
    const updatedPaymentInfo = {
      ...paymentInfo,
      [field]: value || "", // Convert null to empty string
      transactedBy: localStorage.getItem("userName") || "",
    };

    setPaymentInfo(updatedPaymentInfo);

    // Update remaining amount when total amount changes
    if (field === "amount") {
      setRemainingAmount(Number(value || 0));
    }

    // Call debounced save function
    debouncedSavePayment(updatedPaymentInfo);
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

  // Add function to get total allocated amount
  const getTotalAllocated = async (payId) => {
    try {
      const response = await axios.get(
        `${ServerIP}/auth/get-total-tempPaymentAllocated`,
        { params: { payId } }
      );

      if (response.data.Status) {
        return response.data.Result.totalAllocated;
      }
      return 0;
    } catch (error) {
      console.error("Error getting total allocated amount:", error);
      return 0;
    }
  };

  // Update handlePayCheck to preserve page number
  const handlePayCheck = async (orderId, orderAmount, orderTotal) => {
    if (!canEditPayments()) return;

    const newCheckPay = new Set(checkPay);
    const newOrderPayments = { ...orderPayments };

    if (newCheckPay.has(orderId)) {
      // Uncheck: Remove payment and add amount back to remaining
      newCheckPay.delete(orderId);
      const removedPayment = newOrderPayments[orderId]?.payment || 0;
      delete newOrderPayments[orderId];

      // Delete from temp allocation if tempPayId exists
      if (tempPayId) {
        try {
          const response = await axios.post(
            `${ServerIP}/auth/delete-temp-allocation`,
            {
              payId: tempPayId,
              orderId: orderId,
            }
          );

          if (response.data.Status) {
            setAllocationCount(response.data.Result.count);
            setAllocatedAmount(response.data.Result.totalAllocated);
            setRemainingAmount(
              paymentInfo.amount - response.data.Result.totalAllocated
            );
          }
        } catch (error) {
          console.error("Error deleting temp allocation:", error);
        }
      }
    } else {
      // Check: Calculate and apply new payment
      const availableAmount = Math.min(remainingAmount, orderAmount);
      if (availableAmount > 0) {
        let wtaxAmount = 0;
        let paymentAmount = availableAmount;

        // Calculate WTax if selected
        if (selectedWtax) {
          if (selectedWtax.withVAT === 1) {
            const baseAmount = orderTotal / (1 + vatRate / 100);
            wtaxAmount =
              Math.round(baseAmount * (selectedWtax.taxRate / 100) * 100) / 100;
            if (wtaxAmount === paymentAmount) {
              wtaxAmount = 0;
            } else {
              if (availableAmount >= orderAmount) {
                paymentAmount = orderAmount - wtaxAmount;
              } else {
                paymentAmount = availableAmount;
              }
            }
          } else {
            wtaxAmount =
              Math.round(orderAmount * (selectedWtax.taxRate / 100) * 100) /
              100;
          }
        }
        // Save to temp allocation if tempPayId exists
        if (tempPayId && paymentAmount > 0) {
          try {
            const response = await axios.post(
              `${ServerIP}/auth/save-temp-allocation`,
              {
                payId: tempPayId,
                allocation: {
                  orderId: orderId,
                  amount: paymentAmount,
                },
              }
            );

            if (response.data.Status) {
              setAllocationCount(response.data.Result.count);
              setAllocatedAmount(response.data.Result.totalAllocated);
              setRemainingAmount(
                paymentInfo.amount - response.data.Result.totalAllocated
              );

              newCheckPay.add(orderId);
              newOrderPayments[orderId] = {
                payment: paymentAmount.toFixed(2),
                wtax: wtaxAmount.toFixed(2),
              };
            }
          } catch (error) {
            console.error("Error saving temp allocation:", error);
          }
        }
      }
    }

    setCheckPay(newCheckPay);
    setOrderPayments(newOrderPayments);
  };

  // Update handlePaymentChange to preserve page number
  const handlePaymentChange = async (orderId, field, value) => {
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

      // Update temp allocation if we have a tempPayId
      if (tempPayId && payment > 0) {
        try {
          await axios.post(`${ServerIP}/auth/update-temp-allocation`, {
            payId: tempPayId,
            allocation: {
              orderId: orderId,
              amount: payment,
            },
          });

          // Get updated total allocated amount
          const totalAllocated = await getTotalAllocated(tempPayId);
          setRemainingAmount(paymentInfo.amount - totalAllocated);
        } catch (error) {
          console.error("Error updating temp allocation:", error);
        }
      }
    } else if (field === "wtax") {
      newOrderPayments[orderId] = {
        ...newOrderPayments[orderId],
        wtax: numValue,
      };
    }

    setOrderPayments(newOrderPayments);
  };

  // Update canPost to check for OR#
  const canPost = () => {
    return (
      canEditPayments() &&
      remainingAmount === 0 &&
      paymentInfo.ornum.trim() !== ""
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
  const handlePostPayment = async (result, options = {}) => {
    const { skipConfirmation = false } = options;

    // Require OR before asking for confirmation
    if (!result && !paymentInfo.ornum.trim()) {
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

    // Ask for confirmation before proceeding when posting from the form
    if (!result && !skipConfirmation) {
      setAlert({
        show: true,
        title: "Post Payment",
        message: "Are you sure you want to post this payment?",
        type: "confirm",
        onConfirm: () => handlePostPayment(result, { skipConfirmation: true }),
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If result is provided, it means we're posting from the allocation modal
      if (result) {
        setSuccessMessage(
          `Payment of ${formatPeso(result.amount)} posted successfully`
        );
        setShowSuccessModal(true);
        // Close the allocation modal
        setShowAllocationModal(false);
        // Refresh the data to reflect the new state
        await fetchOrderData();
        // Reset payment form state
        setPaymentInfo({
          clientName: "",
          payDate: new Date().toISOString().split("T")[0],
          payType: "CASH",
          amount: "",
          payReference: "",
          ornum: "",
        });
        setOrderPayments({});
        setCheckPay(new Set());
        setTempPayId(null);
        setRemainingAmount(0);
        setAllocatedAmount(0);
        setAllocationCount(0);
        return;
      }

      // Check if total applied matches header amount
      // Use allocatedAmount from database instead of calculating from orderPayments state
      const applied = Number(allocatedAmount);
      const amount = Number(paymentInfo.amount);

      // Only show warning if applied amount is less than payment amount
      if (applied < amount) {
        setAlert({
          show: true,
          title: "Payment Amount Mismatch",
          message: `The total applied amount (${formatPeso(
            applied
          )}) is less than the payment amount (${formatPeso(
            amount
          )}). Do you want to proceed with this partial payment?`,
          type: "confirm",
          onConfirm: () => postPaymentToServer(),
        });
        return;
      }

      // If applied amount is greater than payment amount, show error
      if (applied > amount) {
        setAlert({
          show: true,
          title: "Invalid Payment",
          message: `The total applied amount (${formatPeso(
            applied
          )}) cannot be greater than the payment amount (${formatPeso(
            amount
          )}). Please adjust the allocations.`,
          type: "alert",
          showOkButton: true,
        });
        return;
      }

      // If amounts match, proceed directly
      await postPaymentToServer();
    } catch (error) {
      setError("Failed to post payment");
      console.error("Error posting payment:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to post payment to server
  const postPaymentToServer = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${ServerIP}/auth/post-payment`, {
        payId: tempPayId,
        transactedBy: localStorage.getItem("userName"),
      });

      if (response.data.Status) {
        setSuccessMessage("Payment posted successfully");
        setShowSuccessModal(true);
        // Refresh the data to reflect the new state
        await fetchOrderData();
        // Reset payment form state
        setPaymentInfo({
          clientName: "",
          payDate: new Date().toISOString().split("T")[0],
          payType: "CASH",
          amount: "",
          payReference: "",
          ornum: "",
        });
        setOrderPayments({});
        setCheckPay(new Set());
        setTempPayId(null);
        setRemainingAmount(0);
        setAllocatedAmount(0);
        setAllocationCount(0);
      } else {
        setError(response.data.Error || "Failed to post payment");
      }
    } catch (error) {
      setError("Failed to post payment: " + error.message);
      console.error("Error posting payment:", error);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    checkForTempPayments();
  }, []);

  // Update checkForTempPayments to use the combined response
  const checkForTempPayments = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/check-temp-payments`);
      if (response.data.Status && response.data.hasTempPayments) {
        const tempPayment = response.data.tempPayments[0];
        setPaymentInfo({
          payId: tempPayment.payId,
          amount: tempPayment.amount || "",
          payType: tempPayment.payType || "",
          payReference: tempPayment.payReference || "",
          payDate: tempPayment.payDate
            ? new Date(tempPayment.payDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          ornum: tempPayment.ornum || "",
          transactedBy: tempPayment.transactedBy || "",
        });
        setTempPayId(tempPayment.payId);
        setRemainingAmount(Number(tempPayment.amount || 0));

        // If there are allocations, fetch them
        if (tempPayment.allocationCount > 0) {
          const allocationResponse = await axios.get(
            `${ServerIP}/auth/view-allocation`,
            {
              params: { payId: tempPayment.payId },
            }
          );

          if (allocationResponse.data.Status) {
            const allocations =
              allocationResponse.data.paymentAllocation.allocations;
            const newOrderPayments = {};
            allocations.forEach((allocation) => {
              newOrderPayments[allocation.orderId] = {
                payment: Number(allocation.amountApplied || 0),
                wtax: 0,
              };
            });
            setOrderPayments(newOrderPayments);
            setCheckPay(new Set(allocations.map((a) => a.orderId)));
            setAllocationCount(allocationResponse.data.paymentAllocation.count);
            setAllocatedAmount(
              allocationResponse.data.paymentAllocation.totalAllocated
            );
            setRemainingAmount(
              tempPayment.amount -
                allocationResponse.data.paymentAllocation.totalAllocated
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking temp payments:", error);
    }
  };

  const handleCancelPayment = () => {
    setTempPayId(null);
    setOrderPayments({});
    setCheckPay(new Set());
    setAllocationCount(0);
    setPaymentInfo({
      amount: "",
      payType: "CASH",
      payReference: "",
      payDate: new Date().toISOString().split("T")[0],
      ornum: "",
      transactedBy: localStorage.getItem("userName") || "",
      payId: null,
      clientName: "",
    });
    setRemainingAmount(0);
  };

  const handleClientHover = (clientId) => {
    hoverTimerRef.current = setTimeout(() => {
      setSelectedClientId(clientId);
      setShowClientInfo(true);
    }); // 5 seconds
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
    <div className="payment-theme">
      <div className="payment-page-background px-5">
        <div className="payment-header d-flex justify-content-center">
          <h3>Payment Processing</h3>
        </div>

        {/* Action Buttons and Search */}
        <div className="d-flex justify-content-between mb-3">
          <div className="d-flex gap-2">
            <Button variant="save" onClick={() => setShowRemitModal(true)}>
              Payment Summary
            </Button>
            {allocationCount > 0 && (
              <Button
                variant="view"
                onClick={() => setShowAllocationModal(true)}
              >
                Review Allocations ({allocationCount})
              </Button>
            )}
          </div>
          <div className="search-container">
            <label htmlFor="paymentSearch" className="visually-hidden">
              Search payments
            </label>
            <div className="position-relative">
              <input
                id="paymentSearch"
                name="paymentSearch"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by ID, client, project, ordered by, DR#, INV#, OR#, sales, amount, ref..."
                onChange={handleSearch}
                value={displaySearchTerm}
                style={{
                  width: "400px",
                  paddingRight: displaySearchTerm ? "30px" : "12px",
                }}
                aria-label="Search payments"
              />
              {displaySearchTerm && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute"
                  style={{
                    right: "5px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#6c757d",
                    fontSize: "14px",
                    padding: "0",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => {
                    setDisplaySearchTerm("");
                    setSearchTerm("");
                    localStorage.setItem("paymentSearchTerm", "");
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
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
                  className="form-input"
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
                  className="form-input"
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
                  className="form-input"
                  value={searchClientName}
                  onChange={(e) => setSearchClientName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleClientSearch(e);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value !== paymentInfo.clientName) handleClientSearch(e);
                  }}
                  placeholder="Enter client name"
                  list="clientList"
                  autoComplete="off"
                />
                <datalist id="clientList">
                  {clientList.map((client) => (
                    <option key={client.id} value={client.clientName}>
                      {client.customerName}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label htmlFor="ornum">OR#</label>
                <input
                  id="ornum"
                  type="text"
                  className="form-input"
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
                  className="form-input"
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
                  className="form-input"
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

        {/* Add View Allocations and Remit buttons after the payment info header */}
        <div className="d-flex justify-content-end mb-3">
          <select
            id="vat-select"
            className="form-input"
            style={{ width: "250px" }}
            value={selectedWtax?.WTax}
            onChange={(e) => {
              const selected = wtaxTypes.find((w) => w.WTax === e.target.value);
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
          <table className="table table-hover table-striped">
            <thead className="table table-head">
              <tr>
                <th
                  className="text-center"
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                >
                  JO # {getSortIndicator("id")}
                </th>
                <th className="text-center">Prod Date</th>
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
                <th className="text-center">Pay</th>
                <th className="text-right">Payment</th>
                <th className="text-right">WTax</th>
                <th className="text-right">Balance</th>
                <th className="text-center">Date Paid</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0); // Set time to midnight for accurate date comparison

                // Safely handle hold and overdue dates
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
                        navigate(`/dashboard/payment/view/${order.id}`)
                      }
                    >
                      {order.id}
                    </td>
                    <td>{formatDate(order.productionDate)}</td>
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
                    <td
                      className="cursor-pointer"
                      onClick={() => {
                        if (order.invnum) {
                          setSelectedOrderId(order.id);
                          setShowInvoiceDetails(true);
                        }
                      }}
                      style={{ cursor: order.invnum ? "pointer" : "default" }}
                    >
                      {order.invnum || ""}
                    </td>
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
                      {formatPesoZ(order.amountPaid)}
                    </td>
                    <td>{order.orNums || ""}</td>
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
                              (
                                order.grandTotal - (order.amountPaid || 0)
                              ).toFixed(2),
                              order.grandTotal
                            )
                          }
                          disabled={
                            !canEditPayments() ||
                            (remainingAmount <= 0 && !checkPay.has(order.id)) ||
                            order.grandTotal - order.amountPaid <= 0
                          }
                        />
                      </div>
                    </td>
                    <td className="text-right">
                      {canEditPayments() && checkPay.has(order.id) ? (
                        <input
                          type="number"
                          className="form-input detail text-end"
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
                        formatPesoZ(orderPayments[order.id]?.payment)
                      )}
                    </td>
                    <td className="text-right">
                      {canEditPayments() && checkPay.has(order.id) ? (
                        <input
                          type="number"
                          className="form-input detail text-end"
                          value={orderPayments[order.id]?.wtax || 0}
                          onChange={(e) =>
                            handlePaymentChange(
                              order.id,
                              "wtax",
                              e.target.value
                            )
                          }
                          min="0"
                        />
                      ) : (
                        formatPesoZ(orderPayments[order.id]?.wtax)
                      )}
                    </td>
                    <td className="text-right">
                      {(() => {
                        const balance =
                          order.grandTotal -
                          (order.amountPaid || 0) -
                          (orderPayments[order.id]?.payment || 0);
                        const grandTotalNetOfVat =
                          order.grandTotal / (1 + vatRate / 100);
                        const balancePercentage =
                          (balance / grandTotalNetOfVat) * 100;
                        return balance > 0 ? (
                          <div>
                            <div>{formatPeso(balance)}</div>
                            <div className="text-muted small">
                              {balancePercentage.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          ""
                        );
                      })()}
                    </td>
                    <td>
                      {order.datePaid
                        ? new Date(order.datePaid).toLocaleDateString()
                        : ""}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="table-info">
                <td colSpan="10"></td>
                <td className="text-right">
                  <div
                    className="position-relative"
                    onMouseOver={(e) => {
                      if (!canPost()) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const message = getTooltipMessage();
                        const messageWidth = message.length * 10;
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
                      onClick={() => handlePostPayment(null)}
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
                  Unallocated:
                  <strong>{formatPeso(remainingAmount)}</strong>
                </td>
                <td></td>
                <td className="text-right">
                  Allocated:
                  <strong>{formatPeso(allocatedAmount)}</strong>
                </td>
                <td colSpan="3"></td>
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
              // fetchOrderData();
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
      <ModalAlert
        show={showSuccessModal}
        title="Success"
        message={successMessage}
        type="alert"
        showCancelButton={true}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => {
          setShowSuccessModal(false);
          navigate("/dashboard/payment");
        }}
        confirmText="Ok"
      />
      <Modal
        variant="tooltip"
        show={showTooltip && !canPost()}
        position={tooltipPosition}
      >
        <div className="text-center">{getTooltipMessage()}</div>
      </Modal>
      <ModalAlert
        show={showModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCancelButton={modalConfig.showCancelButton}
        onClose={() => setShowModal(false)}
        onConfirm={modalConfig.onConfirm}
      />
      <PaymentAllocationModal
        show={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        paymentInfo={paymentInfo}
        orderPayments={orderPayments}
        orders={orders}
        onPostPayment={handlePostPayment}
        onCancelPayment={handleCancelPayment}
        setOrderPayments={setOrderPayments}
        setCheckPay={setCheckPay}
        setAllocationCount={setAllocationCount}
        setAllocatedAmount={setAllocatedAmount}
        setRemainingAmount={setRemainingAmount}
        fetchOrderData={fetchOrderData}
      />
      <RemitModal
        show={showRemitModal}
        onClose={() => setShowRemitModal(false)}
      />
      <ViewCustomerInfo
        clientId={selectedClientId}
        show={showClientInfo}
        onClose={() => setShowClientInfo(false)}
      />
      <InvoiceDetailsModal
        show={showInvoiceDetails}
        onClose={() => setShowInvoiceDetails(false)}
        orderId={selectedOrderId}
      />
    </div>
  );
}

export default Payment;
