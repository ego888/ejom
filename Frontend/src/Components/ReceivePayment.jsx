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
import { formatPeso } from "../utils/orderUtils";
import ModalAlert from "../Components/UI/ModalAlert";
import Modal from "./UI/Modal";
import PaymentAllocationModal from "./PaymentAllocationModal";
import RemitModal from "./RemitModal";
import ViewCustomerInfo from "./UI/ViewCustomerInfo";

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

  // Update handleClientSearch to use fetchOrderData
  const handleClientSearch = async (e) => {
    if (e.type === "keydown" && e.key !== "Enter") return;
    if (e.type === "blur" && searchTerm.trim() === "") return;

    // Update payment info with client name
    setPaymentInfo((prev) => ({
      ...prev,
      clientName: searchTerm,
    }));

    // Reset to first page when searching
    setCurrentPage(1);

    // Fetch data using main function
    await fetchOrderData();
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

  // Update handlePayCheck to use save-temp-allocation
  const handlePayCheck = async (orderId, orderAmount, orderTotal) => {
    if (!canEditPayments()) return;

    console.log("passed orderTotal", orderTotal);
    console.log("passed orderAmount", orderAmount);

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

      // Delete from temp allocation if tempPayId exists
      if (tempPayId) {
        try {
          await axios.post(`${ServerIP}/auth/delete-temp-allocation`, {
            payId: tempPayId,
            orderId: orderId,
          });
        } catch (error) {
          console.error("Error deleting temp allocation:", error);
        }
      }
    } else {
      // Check: Calculate and apply new payment
      const availableAmount = Math.min(remainingAmount, orderAmount);
      console.log("orderID", orderId);
      console.log("Available Amount 1:", availableAmount);
      console.log("Order Total 1:", orderTotal);
      console.log("Order Balance 1:", orderAmount);
      console.log("Remaining Amount 1:", remainingAmount);
      if (availableAmount > 0) {
        let wtaxAmount = 0;
        let paymentAmount = availableAmount;

        // Calculate WTax if selected
        console.log("Selected WTax:", selectedWtax);
        if (selectedWtax) {
          if (selectedWtax.withVAT === 1) {
            const baseAmount = orderTotal / (1 + vatRate / 100);
            wtaxAmount =
              Math.round(baseAmount * (selectedWtax.taxRate / 100) * 100) / 100;
            if (availableAmount >= orderAmount) {
              paymentAmount = orderAmount - wtaxAmount;
            } else {
              paymentAmount = availableAmount;
            }
          } else {
            wtaxAmount =
              Math.round(orderAmount * (selectedWtax.taxRate / 100) * 100) /
              100;
          }
        }
        console.log("Available Amount:", availableAmount);
        console.log("Order Total:", orderTotal);
        console.log("Order Balance:", orderAmount);
        console.log("Payment Amount:", paymentAmount);

        // Ensure we don't exceed the input amount
        if (currentTotal + paymentAmount <= paymentInfo.amount) {
          newCheckPay.add(orderId);
          newOrderPayments[orderId] = {
            payment: paymentAmount,
            wtax: wtaxAmount,
          };
          // Update remaining amount based on payment only
          setRemainingAmount((prev) => prev - paymentAmount);

          // Save to temp allocation if tempPayId exists
          if (tempPayId && paymentAmount > 0) {
            try {
              await axios.post(`${ServerIP}/auth/save-temp-allocation`, {
                payId: tempPayId,
                allocation: {
                  orderId: orderId,
                  amount: paymentAmount,
                },
              });
            } catch (error) {
              console.error("Error saving temp allocation:", error);
            }
          }
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
  const handlePostPayment = async (result) => {
    try {
      setLoading(true);
      setError(null);

      // Validate OR# if posting directly from form
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

      // If result is provided, it means we're posting from the allocation modal
      if (result) {
        setSuccessMessage(
          `Payment of ${formatPeso(result.amount)} posted successfully`
        );
        setShowSuccessModal(true);
        setTempPayId(null);
        return;
      }

      // Check if total applied matches header amount
      const totalApplied = Object.values(orderPayments).reduce(
        (sum, p) => sum + (p.payment || 0),
        0
      );

      // Convert both to numbers
      const applied = Number(totalApplied);
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
          showOkButton: true,
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
      // Ensure all numeric values are properly converted
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
            amount: Number(details.payment || 0),
          })
        ),
      };

      console.log("Sending payment payload:", JSON.stringify(payload, null, 2));
      const response = await axios.post(
        `${ServerIP}/auth/post-payment`,
        payload
      );

      if (response.data.Status) {
        setSuccessMessage(
          `Payment of ${formatPeso(paymentInfo.amount)} posted successfully`
        );
        setShowSuccessModal(true);

        // Clear all payment-related state
        setOrderPayments({});
        setRemainingAmount(0);
        setCheckPay(new Set());
        setTempPayId(null);
        setPaymentInfo({
          amount: "",
          payType: "",
          payReference: "",
          payDate: new Date().toISOString().split("T")[0],
          ornum: "",
          transactedBy: localStorage.getItem("userName") || "",
        });

        // Refresh order data
        fetchOrderData();
      } else {
        setError(response.data.Error);
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

      setError(errorMessage);
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
          }
        }
      }
    } catch (error) {
      console.error("Error checking temp payments:", error);
    }
  };

  const handleSavePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare allocations
      const allocations = Object.entries(orderPayments).map(
        ([orderId, details]) => ({
          orderId: parseInt(orderId),
          amount: details.payment || 0,
        })
      );

      // Save to temp tables
      const response = await axios.post(`${ServerIP}/auth/save-temp-payment`, {
        payment: paymentInfo,
        allocations,
      });

      if (response.data.Status) {
        setTempPayId(response.data.Result.payId);
        setShowAllocationModal(true);
      } else {
        setError(response.data.Error);
      }
    } catch (error) {
      setError("Failed to save payment");
      console.error("Error saving payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setTempPayId(null);
    setOrderPayments({});
    setPaymentInfo({
      amount: "",
      payType: "",
      payReference: "",
      payDate: "",
      ornum: "",
      transactedBy: localStorage.getItem("userName") || "",
    });
  };

  const handleAddPayment = async () => {
    if (!selectedOrder || !amount) {
      setError("Please select an order and enter an amount");
      return;
    }

    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (amount > remainingAmount) {
      setError("Amount cannot exceed remaining payment amount");
      return;
    }

    try {
      // Make sure we have a tempPayId
      if (!tempPayId) {
        // First save the payment header
        const paymentResponse = await axios.post(
          `${ServerIP}/auth/save-temp-payment`,
          {
            payment: {
              ...paymentInfo,
              transactedBy: localStorage.getItem("userName") || "unknown",
            },
          }
        );

        if (!paymentResponse.data.Status) {
          setError(
            paymentResponse.data.Error || "Failed to save payment header"
          );
          return;
        }

        setTempPayId(paymentResponse.data.Result.payId);
      }

      // Now save the allocation
      const response = await axios.post(
        `${ServerIP}/auth/save-temp-allocation`,
        {
          payId: tempPayId,
          allocation: {
            orderId: selectedOrder.orderId,
            amount: parseFloat(amount),
          },
        }
      );

      if (response.data.Status) {
        // Add to local state
        setOrderPayments((prev) => ({
          ...prev,
          [selectedOrder.orderId]: {
            payment: parseFloat(amount),
            wtax: 0, // Could calculate WTax here if needed
          },
        }));

        // Update remaining amount
        setRemainingAmount((prev) => prev - parseFloat(amount));

        // Add to checked orders
        setCheckPay((prev) => new Set([...prev, selectedOrder.orderId]));

        // Reset form
        setSelectedOrder(null);
        setAmount("");
        setError("");
      } else {
        setError(response.data.Error || "Failed to save allocation");
      }
    } catch (error) {
      console.error("Error saving allocation:", error);
      setError("Failed to save allocation");
    }
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
            {checkPay.size > 0 && (
              <Button
                variant="view"
                onClick={() => setShowAllocationModal(true)}
              >
                View Allocations ({checkPay.size})
              </Button>
            )}
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
                  onKeyDown={handleClientSearch}
                  onBlur={handleClientSearch}
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
                <th className="text-center">Pay</th>
                <th className="text-right">Payment</th>
                <th className="text-right">WTax</th>
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
                    {order.amountPaid > 0
                      ? `₱${order.amountPaid.toLocaleString()}`
                      : ""}
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
                    ) : orderPayments[order.id]?.payment > 0 ? (
                      formatPeso(orderPayments[order.id]?.payment)
                    ) : (
                      ""
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
                    ) : orderPayments[order.id]?.wtax > 0 ? (
                      formatPeso(orderPayments[order.id]?.wtax)
                    ) : (
                      ""
                    )}
                  </td>
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
                <td colSpan="10"></td>
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
      <PaymentAllocationModal
        show={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        paymentInfo={paymentInfo}
        orderPayments={orderPayments}
        orders={orders}
        onPostPayment={handlePostPayment}
        onCancelPayment={handleCancelPayment}
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
    </div>
  );
}

export default Prod;
