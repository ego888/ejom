import axios from "axios";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AddQuoteDetails from "./AddQuoteDetails";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import Dropdown2 from "./UI/Dropdown2";
import { BiRectangle } from "react-icons/bi";
//import "./Quotes.css";
import {
  validateDetail,
  calculateArea,
  calculatePrice,
  calculateAmount,
  formatNumber,
  formatPeso,
  handleApiError,
  calculateTotals,
  calculatePerSqFt,
  calculatePrintHrs,
} from "../utils/orderUtils";
import { ServerIP } from "../config";
import { debounce } from "lodash";
import ModalAlert from "./UI/ModalAlert";
import axiosConfig from "../utils/axiosConfig"; // Import configured axios
import ViewCustomerInfo from "./UI/ViewCustomerInfo";
import { getClientBackgroundStyle } from "../utils/clientOverdueStyle";

function AddQuote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [orderId, setOrderId] = useState(null);
  const [currentUser, setCurrentUser] = useState({});
  const [clients, setClients] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const [error, setError] = useState({
    clientId: false,
    projectName: false,
    preparedBy: false,
    graphicsBy: false,
  });

  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const [data, setData] = useState({
    clientId: "",
    clientName: "",
    projectName: "",
    preparedBy: "",
    quoteDate: new Date().toISOString().split("T")[0],
    orderedBy: "",
    orderReference: "",
    email: "",
    cellNumber: "",
    telNum: "",
    specialInst: "",
    deliveryInst: "",
    graphicsBy: "",
    dueDate: "",
    dueTime: "",
    terms: "",
    status: "Open",
    amountDiscount: 0,
    percentDisc: 0,
    grandTotal: 0,
    totalHrs: 0,
    deliveryRemarks: "",
  });

  const [quoteDetails, setQuoteDetails] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const [isHeaderSaved, setIsHeaderSaved] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [editingRowId, setEditingRowId] = useState(null);

  const [units, setUnits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editedValues, setEditedValues] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [currentDetailId, setCurrentDetailId] = useState(null);
  const [allowanceValues, setAllowanceValues] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const [dropdownsLoaded, setDropdownsLoaded] = useState(false);

  const [editingDisplayOrder, setEditingDisplayOrder] = useState(null);
  const [tempDisplayOrder, setTempDisplayOrder] = useState(null);

  const [paymentTerms, setPaymentTerms] = useState([]);

  const [showAllowanceTooltip, setShowAllowanceTooltip] = useState(false);
  const [tooltipDetail, setTooltipDetail] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [showClientInfo, setShowClientInfo] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const hoverTimerRef = useRef(null);

  // Move haveTotalsChanged to the top, before any hooks
  const haveTotalsChanged = (newTotals, savedTotals) => {
    return (
      newTotals.totalAmount !== savedTotals.totalAmount ||
      newTotals.amountDiscount !== savedTotals.amountDiscount ||
      newTotals.percentDisc !== savedTotals.percentDisc ||
      newTotals.grandTotal !== savedTotals.grandTotal ||
      newTotals.totalHrs !== savedTotals.totalHrs
    );
  };

  // Rest of your state declarations...
  const [lastSavedTotals, setLastSavedTotals] = useState({
    totalAmount: 0,
    amountDiscount: 0,
    percentDisc: 0,
    grandTotal: 0,
    totalHrs: 0,
  });

  // Modify debouncedUpdateTotals to handle the percentDisc range
  const debouncedUpdateTotals = useCallback(
    debounce((totals) => {
      if (isInitialLoad) return;

      // Ensure percentDisc is within valid range (assuming decimal(3,2) in MySQL)
      const validatedTotals = {
        ...totals,
        percentDisc: Math.min(
          Math.max(parseFloat(totals.percentDisc) || 0, 0),
          99.99
        ),
      };

      if (!haveTotalsChanged(validatedTotals, lastSavedTotals)) return;

      const token = localStorage.getItem("token");
      axios
        .put(
          `${ServerIP}/auth/quotes/update_totals/${orderId || id}`,
          validatedTotals,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then(() => {
          setLastSavedTotals(validatedTotals);
        })
        .catch((error) => {
          console.error("Error updating totals:", error);
          handleApiError(error, navigate, setAlert);
        });
    }, 5000),
    [isInitialLoad, orderId, id, lastSavedTotals, navigate]
  );

  // Clean up the debounced function when component unmounts
  useEffect(() => {
    return () => {
      debouncedUpdateTotals.cancel();
    };
  }, [debouncedUpdateTotals]);

  const handleDiscountChange = (type, value) => {
    if (isInitialLoad) return;

    const subtotal = quoteDetails.reduce(
      (sum, detail) => sum + parseFloat(detail.amount || 0),
      0
    );
    let newDiscAmount, newPercentDisc, newGrandTotal;

    if (type === "percent") {
      // Ensure percent is within valid range
      newPercentDisc = Math.min(Math.max(parseFloat(value) || 0, 0), 99.99);
      newDiscAmount = (subtotal * newPercentDisc) / 100;
      newGrandTotal = Number(subtotal - newDiscAmount).toFixed(2);
    } else {
      newDiscAmount = Math.min(parseFloat(value) || 0, subtotal);
      newPercentDisc =
        subtotal > 0
          ? Math.min(((newDiscAmount / subtotal) * 100).toFixed(2), 99.99)
          : 0;
      newGrandTotal = Number(subtotal - newDiscAmount).toFixed(2);
    }

    const newTotals = {
      totalAmount: Number(subtotal).toFixed(2),
      amountDiscount: newDiscAmount,
      percentDisc: newPercentDisc,
      grandTotal: Number(newGrandTotal).toFixed(2),
      totalHrs: data.totalHrs,
      editedBy: localStorage.getItem("userName"),
    };

    if (haveTotalsChanged(newTotals, lastSavedTotals)) {
      setData((prev) => ({
        ...prev,
        ...newTotals,
      }));

      if (orderId || id) {
        debouncedUpdateTotals(newTotals);
      }
    }
  };

  const fetchQuoteDetails = () => {
    if (!orderId && !id) return;

    const token = localStorage.getItem("token");
    axios
      .get(`${ServerIP}/auth/quote_details/${orderId || id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((result) => {
        if (result.data.Status) {
          setQuoteDetails(result.data.Result);
          if (!isInitialLoad) {
            const totals = calculateQuoteTotals(result.data.Result, true);
            const newTotals = {
              totalAmount: parseFloat(totals.subtotal),
              amountDiscount: parseFloat(totals.amountDiscount),
              percentDisc: parseFloat(totals.percentDisc),
              grandTotal: parseFloat(totals.grandTotal),
              totalHrs: parseFloat(totals.totalHrs),
            };

            setData((prev) => ({
              ...prev,
              ...newTotals,
            }));

            // Update lastSavedTotals after fetching details
            setLastSavedTotals(newTotals);
          }
        }
      })
      .catch((err) => console.log(err));
  };

  // const fetchClients = async () => {
  //   try {
  //     const response = await axiosConfig.get(`${ServerIP}/auth/client`);
  //     if (response.data.Status) {
  //       const result = response.data.Result || [];
  //       setClients(result);
  //     } else {
  //       setAlert({
  //         show: true,
  //         title: "Error",
  //         message: response.data.Error || "Failed to fetch clients",
  //         type: "alert",
  //       });
  //     }
  //   } catch (err) {
  //     console.error("Error fetching clients:", err);
  //     setAlert({
  //       show: true,
  //       title: "Error",
  //       message: "Failed to fetch clients. Please try again.",
  //       type: "alert",
  //     });
  //   }
  // };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    axios
      .get(`${ServerIP}/auth/clients`, config)
      .then((result) => {
        if (result.data.Status) {
          setClients(result.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to fetch clients",
          type: "alert",
        });
      });

    axios
      .get(`${ServerIP}/auth/sales_employees`, config)
      .then((result) => {
        if (result.data.Status) {
          setSalesEmployees(result.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to fetch sales employees",
          type: "alert",
        });
      });

    // axios
    //   .get(`${ServerIP}/auth/artists`, config)
    //   .then((result) => {
    //     if (result.data.Status) {
    //       setArtists(result.data.Result);
    //     }
    //   })
    //   .catch((err) => console.log(err));

    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUser(decoded);
      setData((prev) => ({ ...prev, preparedBy: decoded.id }));
    }
  }, []);

  useEffect(() => {
    const subtotal = quoteDetails.reduce(
      (acc, detail) =>
        acc +
        parseFloat(detail.unitPrice || 0) * parseFloat(detail.quantity || 0),
      0
    );
    const totalDiscount = quoteDetails.reduce(
      (acc, detail) =>
        acc +
        parseFloat(detail.unitPrice || 0) *
          parseFloat(detail.quantity || 0) *
          (parseFloat(detail.discount || 0) / 100),
      0
    );
    const grandTotal = subtotal - totalDiscount;

    setSubtotal(subtotal.toFixed(2));
    setTotalDiscount(totalDiscount.toFixed(2));
    setGrandTotal(grandTotal.toFixed(2));
  }, [quoteDetails]);

  useEffect(() => {
    if (id) {
      const token = localStorage.getItem("token");
      setIsInitialLoad(true);
      axios
        .get(`${ServerIP}/auth/quote/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((result) => {
          if (result.data.Status) {
            const quoteData = result.data.Result;
            console.log("Raw quote data:", quoteData);
            console.log("preparedBy value:", quoteData.preparedBy);
            console.log("preparedBy type:", typeof quoteData.preparedBy);

            // Set all the data at once with proper type conversion
            const initialData = {
              clientId: parseInt(quoteData.clientId),
              clientName: quoteData.clientName || "",
              customerName: quoteData.customerName || "",
              hold: quoteData.hold || "",
              overdue: quoteData.overdue || "",
              projectName: quoteData.projectName || "",
              preparedBy: quoteData.preparedBy || "",
              quoteDate:
                quoteData.quoteDate || new Date().toISOString().split("T")[0],
              orderedBy: quoteData.orderedBy || "",
              orderReference: quoteData.refId || "",
              email: quoteData.email || "",
              cellNumber: quoteData.cellNumber || "",
              telNum: quoteData.telNum || "",
              specialInst: quoteData.statusRem || "",
              dueDate: quoteData.dueDate || "",
              totalAmount: quoteData.totalAmount
                ? parseFloat(quoteData.totalAmount)
                : 0,
              amountDiscount: quoteData.amountDiscount
                ? parseFloat(quoteData.amountDiscount)
                : 0,
              percentDisc: quoteData.percentDisc
                ? parseFloat(quoteData.percentDisc)
                : 0,
              grandTotal: quoteData.grandTotal
                ? parseFloat(quoteData.grandTotal)
                : 0,
              totalHrs: quoteData.totalHrs ? parseFloat(quoteData.totalHrs) : 0,
              editedBy: quoteData.editedBy || "",
              lastEdited: quoteData.lastedited || "",
              orderId: parseInt(quoteData.quoteId),
              terms: quoteData.terms || "",
              deliveryRemarks: quoteData.deliveryRemarks || "",
              status: quoteData.status || "Open",
            };

            setData(initialData);
            // Set initial lastSavedTotals
            setLastSavedTotals({
              totalAmount: parseFloat(quoteData.totalAmount) || 0,
              amountDiscount: parseFloat(quoteData.amountDiscount) || 0,
              percentDisc: parseFloat(quoteData.percentDisc) || 0,
              grandTotal: parseFloat(quoteData.grandTotal) || 0,
              totalHrs: parseFloat(quoteData.totalHrs) || 0,
            });
            setIsHeaderSaved(true);
            setOrderId(id);
            fetchQuoteDetails();
            setIsInitialLoad(false);
          }
        })
        .catch((err) => {
          console.error("Error fetching quote:", err);
          handleApiError(err, navigate, setAlert);
        });
    }
  }, [id, navigate, setAlert]);

  const fetchDropdownData = async () => {
    if (dropdownsLoaded) return;

    const token = localStorage.getItem("token");
    try {
      const [unitsRes, materialsRes] = await Promise.all([
        axios.get(`${ServerIP}/auth/units`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${ServerIP}/auth/materials`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (unitsRes.data.Status) {
        setUnits(unitsRes.data.Result);
      }
      if (materialsRes.data.Status) {
        setMaterials(materialsRes.data.Result);
      }
      setDropdownsLoaded(true);
    } catch (err) {
      handleApiError(err, navigate, setAlert);
    }
  };

  const handleSubmit = (e, isPrintAction = false) => {
    if (!canEdit()) {
      setAlert({
        show: true,
        title: "Permission Denied",
        message: "You don't have permission to edit this record",
        type: "alert",
      });
      return;
    }
    e?.preventDefault();

    // Validate required fields
    const newError = {};
    if (!data.clientName) newError.clientId = true;
    if (!data.projectName) newError.projectName = true;
    if (!data.preparedBy) newError.preparedBy = true;

    if (Object.keys(newError).length > 0) {
      setError(newError);
      return;
    }

    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const currentDateTime = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Calculate final totals
    const totals = calculateQuoteTotals(quoteDetails);

    // Prepare data for sending
    const dataToSend = {
      clientId: data.clientId,
      clientName: data.clientName,
      projectName: data.projectName,
      preparedBy: data.preparedBy,
      quoteDate: data.quoteDate || currentDateTime,
      orderedBy: data.orderedBy || null,
      refId: data.orderReference || null,
      email: data.email || null,
      cellNumber: data.cellNumber || null,
      telNum: data.telNum || null,
      statusRem: data.specialInst || null,
      dueDate: data.dueDate || null,
      totalAmount: totals.subtotal,
      amountDiscount: totals.amountDiscount,
      percentDisc: totals.percentDisc,
      grandTotal: totals.grandTotal,
      totalHrs: totals.totalHrs,
      editedBy: localStorage.getItem("userName"),
      lastEdited: currentDateTime,
      status: data.status,
      terms: data.terms || null,
      deliveryRemarks: data.deliveryRemarks || null,
    };

    if (!isHeaderSaved) {
      // Create new quote
      axios
        .post(`${ServerIP}/auth/add_quote`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((result) => {
          if (result.data.Status) {
            const quoteId = result.data.QuoteID;
            setOrderId(quoteId);
            setIsHeaderSaved(true);
            setData((prev) => ({
              ...prev,
              quoteId: quoteId,
              ...dataToSend,
            }));
          } else {
            setAlert({
              show: true,
              title: "Error",
              message: result.data.Error || "Failed to save quote",
              type: "alert",
            });
          }
        })
        .catch((err) => {
          console.error("Error saving quote:", err);
          handleApiError(err, navigate, setAlert);
        });
    } else {
      // Update existing quote
      axios
        .put(`${ServerIP}/auth/update_quote/${orderId}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((result) => {
          if (result.data.Status) {
            if (isEditMode && !isPrintAction) {
              navigate("/dashboard/quotes");
            }
          } else {
            setAlert({
              show: true,
              title: "Error",
              message: result.data.Error || "Failed to update quote",
              type: "alert",
            });
          }
        })
        .catch((err) => {
          console.error("Error updating quote:", err);
          handleApiError(err, navigate, setAlert);
        });
    }
  };

  const handleError = (err) => {
    if (
      err.response?.status === 401 ||
      err.response?.data?.Error?.includes("jwt expired") ||
      err.response?.data?.Error?.includes("invalid token")
    ) {
      setAlert({
        show: true,
        title: "Session Expired",
        message: "Your session has expired. Please log out and log in again.",
        type: "alert",
      });
      localStorage.removeItem("token");
      navigate("/");
    } else {
      setAlert({
        show: true,
        title: "Error",
        message: err.response?.data?.Error || "An error occurred",
        type: "alert",
      });
    }
  };

  const calculateQuoteTotals = (quoteDetails, preserveDiscounts = true) => {
    let subtotal = 0;
    let totalHrs = 0;

    quoteDetails.forEach((detail) => {
      subtotal += parseFloat(detail.amount || 0);
      totalHrs += parseFloat(detail.printHours || 0);
    });

    // Get current discount values - ensure they're numbers
    const currentAmountDisc = preserveDiscounts
      ? parseFloat(data.amountDiscount || 0)
      : 0;

    // Calculate percentage discount based on amount discount and subtotal
    const currentPercentDisc = preserveDiscounts
      ? subtotal > 0
        ? ((currentAmountDisc / subtotal) * 100).toFixed(2)
        : 0
      : 0;

    // Calculate grand total using amount discount directly
    const grandTotal = subtotal - currentAmountDisc;

    return {
      subtotal,
      amountDiscount: currentAmountDisc,
      percentDisc: currentPercentDisc,
      grandTotal,
      totalHrs,
    };
  };

  const handleDetailAdded = async (quoteId) => {
    try {
      const response = await axios.get(
        `${ServerIP}/auth/quote_details/${quoteId}`
      );
      if (response.data.Status) {
        const detailsWithPrintHours = response.data.Result.map((detail) => {
          if (detail.material && detail.squareFeet && detail.quantity) {
            const printHrs = calculatePrintHrs(
              detail.squareFeet,
              detail.quantity,
              detail.material,
              materials
            );
            return { ...detail, printHours: printHrs };
          }
          return detail;
        });

        setQuoteDetails(detailsWithPrintHours);
        const totals = calculateQuoteTotals(detailsWithPrintHours, true);

        // Calculate percentage discount based on amount discount and subtotal
        const newPercentDisc =
          totals.subtotal > 0
            ? Math.min(
                ((data.amountDiscount / totals.subtotal) * 100).toFixed(2),
                99.99
              )
            : 0;

        const newTotals = {
          totalAmount: totals.subtotal,
          amountDiscount: data.amountDiscount,
          percentDisc: newPercentDisc,
          grandTotal: totals.grandTotal,
          totalHrs: totals.totalHrs,
          editedBy: localStorage.getItem("userName"),
        };

        // Only update if values have changed
        if (haveTotalsChanged(newTotals, data)) {
          setData((prev) => ({
            ...prev,
            ...newTotals,
          }));

          if (!isInitialLoad) {
            debouncedUpdateTotals(newTotals);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching quote details:", error);
    }
  };

  const handleDeleteDetail = (detailId) => {
    if (!canEdit()) {
      setAlert({
        show: true,
        title: "Permission Denied",
        message: "You don't have permission to delete details",
        type: "alert",
      });
      return;
    }

    setAlert({
      show: true,
      title: "Confirm Deletion",
      message: "Are you sure you want to delete this item?",
      type: "confirm",
      onConfirm: () => {
        const token = localStorage.getItem("token");

        // Find the detail to be deleted
        // const detailToDelete = quoteDetails.find(
        //   (detail) => detail.id === parseInt(detailId)
        // );
        // if (!detailToDelete) {
        //   setAlert({
        //     show: true,
        //     title: "Error",
        //     message: "Detail not found",
        //     type: "alert",
        //   });
        //   return;
        // }

        // Filter out the deleted detail
        const updatedDetails = quoteDetails.filter(
          (detail) => detail.Id !== parseInt(detailId)
        );
        const totals = calculateQuoteTotals(updatedDetails);

        console.log("Detail ID:", detailId);
        axios
          .delete(`${ServerIP}/auth/quote-detail-delete/${detailId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((detailResult) => {
            if (detailResult.data.Status) {
              setQuoteDetails(updatedDetails);

              // Update local state
              setData((prev) => ({
                ...prev,
                totalAmount: totals.subtotal,
                amountDiscount: totals.amountDiscount,
                percentDisc: totals.percentDisc,
                grandTotal: totals.grandTotal,
                totalHrs: totals.totalHrs,
              }));

              // Queue update to server
              debouncedUpdateTotals({
                totalAmount: totals.subtotal,
                amountDiscount: totals.amountDiscount,
                percentDisc: totals.percentDisc,
                grandTotal: totals.grandTotal,
                totalHrs: totals.totalHrs,
                editedBy: localStorage.getItem("userName"),
              });
            } else {
              setAlert({
                show: true,
                title: "Error",
                message: detailResult.data.Error,
                type: "alert",
              });
            }
          })
          .catch((err) => handleApiError(err, navigate, setAlert));
      },
    });
  };

  const handleEditClick = (uniqueId, detail) => {
    if (!canEdit()) {
      setAlert({
        show: true,
        title: "Permission Denied",
        message: "You don't have permission to edit details",
        type: "alert",
      });
      return;
    }
    console.log("Edit clicked for unique ID:", uniqueId);
    console.log("Detail data:", detail);
    console.log("persqft value:", detail.persqft);
    console.log("Material value:", detail.material);

    if (!dropdownsLoaded) {
      fetchDropdownData();
    }
    setEditingRowId(uniqueId);

    const editedDetail = {
      ...detail,
      quantity: detail.quantity || "",
      width: detail.width || "",
      height: detail.height || "",
      unit: detail.unit || "",
      material: detail.material || "",
      persqft: detail.persqft || "",
      unitPrice: detail.unitPrice || "",
      discount: detail.discount || "",
      amount: detail.amount || "",
      remarks: detail.remarks || "",
      itemDescription: detail.itemDescription || "",
    };

    setEditedValues({
      [uniqueId]: editedDetail,
    });
  };

  const handleFinish = () => {
    // Force an immediate update before navigating
    debouncedUpdateTotals.cancel();
    updateTotalsToServer({
      totalAmount: data.totalAmount,
      amountDiscount: data.amountDiscount,
      percentDisc: data.percentDisc,
      grandTotal: data.grandTotal,
      totalHrs: data.totalHrs,
      editedBy: localStorage.getItem("userName"),
    }).then(() => {
      navigate("/dashboard/quotes");
    });
  };

  // Add this new function to handle navigation
  const handleNavigation = () => {
    // Force an immediate update before navigating
    debouncedUpdateTotals.cancel();
    updateTotalsToServer({
      totalAmount: data.totalAmount,
      amountDiscount: data.amountDiscount,
      percentDisc: data.percentDisc,
      grandTotal: data.grandTotal,
      totalHrs: data.totalHrs,
      editedBy: localStorage.getItem("userName"),
    }).then(() => {
      navigate("/dashboard/quotes");
    });
  };

  // Add handleCancel function and ESC key listener
  const handleCancel = () => {
    handleNavigation();
  };

  // Add ESC key event listener
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [navigate]);

  const handleDetailInputChange = (uniqueId, field, value) => {
    setEditedValues((prev) => {
      const updatedValues = {
        ...prev,
        [uniqueId]: {
          ...prev[uniqueId],
          [field]: value,
        },
      };

      const updatedDetail = updatedValues[uniqueId];

      // Calculate area and print hours when width, height, unit, quantity, or material changes
      if (["width", "height", "unit", "quantity", "material"].includes(field)) {
        if (updatedDetail.width && updatedDetail.height && updatedDetail.unit) {
          const area = calculateArea(
            updatedDetail.width,
            updatedDetail.height,
            updatedDetail.unit,
            updatedDetail.quantity || 1
          );
          updatedDetail.squareFeet = area.squareFeet;
          updatedDetail.materialUsage = area.materialUsage;

          // Calculate print hours if we have material
          if (updatedDetail.material && materials) {
            const printHrs = calculatePrintHrs(
              area.squareFeet,
              updatedDetail.quantity || 1,
              updatedDetail.material,
              materials
            );
            console.log("Recalculated print hours:", {
              squareFeet: area.squareFeet,
              quantity: updatedDetail.quantity,
              material: updatedDetail.material,
              printHrs,
            });
            updatedDetail.printHours = printHrs;
          }

          // If we have perSqFt, calculate price and amount
          if (updatedDetail.persqft > 0) {
            const price = calculatePrice(
              area.squareFeet,
              updatedDetail.persqft
            );
            updatedDetail.unitPrice = price.toFixed(2);

            const amount = calculateAmount(
              price,
              updatedDetail.discount || 0,
              updatedDetail.quantity || 1
            );
            updatedDetail.amount = amount.toFixed(2);
          }
        }
      }

      // When unit price changes
      if (field === "unitPrice") {
        if (updatedDetail.squareFeet > 0) {
          const perSqFt = calculatePerSqFt(value, updatedDetail.squareFeet);
          updatedDetail.persqft = perSqFt.toFixed(2);
        } else {
          updatedDetail.persqft = 0;
        }

        const amount = calculateAmount(
          value,
          updatedDetail.discount || 0,
          updatedDetail.quantity || 1
        );
        updatedDetail.amount = amount.toFixed(2);
      }

      // When perSqFt changes
      if (field === "persqft") {
        if (updatedDetail.squareFeet) {
          const price = calculatePrice(updatedDetail.squareFeet, value);
          updatedDetail.unitPrice = price.toFixed(2);

          const amount = calculateAmount(
            price,
            updatedDetail.discount || 0,
            updatedDetail.quantity || 1
          );
          updatedDetail.amount = amount.toFixed(2);
        }
      }

      // When discount changes
      if (field === "discount") {
        if (updatedDetail.unitPrice && updatedDetail.quantity) {
          const amount = calculateAmount(
            updatedDetail.unitPrice,
            value || 0,
            updatedDetail.quantity
          );
          updatedDetail.amount = amount.toFixed(2);
        }
      }

      return updatedValues;
    });

    if (editErrors[uniqueId]?.[field]) {
      setEditErrors((prev) => ({
        ...prev,
        [uniqueId]: {
          ...(prev[uniqueId] || {}),
          [field]: null,
        },
      }));
    }
  };

  const handleSaveDetail = async (uniqueId) => {
    if (!canEdit()) {
      setAlert({
        show: true,
        title: "Permission Denied",
        message: "You don't have permission to save details",
        type: "alert",
      });
      return;
    }
    try {
      const [quoteId, displayOrder] = uniqueId.split("_");
      const editedDetail = editedValues[uniqueId];

      if (!editedDetail) {
        console.error("No edited values found for:", uniqueId);
        return;
      }

      const dataToSend = {
        ...editedDetail,
        quoteId: parseInt(quoteId),
        displayOrder: parseInt(displayOrder),
        quantity: editedDetail.quantity || 0,
        width: editedDetail.width || 0,
        height: editedDetail.height || 0,
        unit: editedDetail.unit || "",
        material: editedDetail.material || "",
        itemDescription: editedDetail.itemDescription || "",
        unitPrice: editedDetail.unitPrice || 0,
        persqft: editedDetail.persqft || 0,
        discount: editedDetail.discount || 0,
        amount: editedDetail.amount || 0,
        squareFeet: editedDetail.squareFeet || 0,
        materialUsage: editedDetail.materialUsage || 0,
        printHrs: editedDetail.printHours || 0,
      };

      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/quote_details/${quoteId}/${displayOrder}`,
        dataToSend,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        // Fetch updated details
        const updatedDetailsResponse = await axios.get(
          `${ServerIP}/auth/quote_details/${quoteId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (updatedDetailsResponse.data.Status) {
          const updatedDetails = updatedDetailsResponse.data.Result;
          setQuoteDetails(updatedDetails);

          // Update local state with the totals returned from the backend
          const { totalAmount, amountDiscount, grandTotal, totalHrs } =
            response.data.Result;
          setData((prev) => ({
            ...prev,
            totalAmount,
            amountDiscount,
            grandTotal,
            totalHrs,
          }));

          setEditingRowId(null);
          setEditedValues({});
        }
      }
    } catch (error) {
      console.error("Error updating quote detail:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Error updating quote detail: " + error.message,
        type: "alert",
      });
    }
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      if (dropdownsLoaded) return;

      const token = localStorage.getItem("token");
      try {
        const [unitsRes, materialsRes] = await Promise.all([
          axios.get(`${ServerIP}/auth/units`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${ServerIP}/auth/materials`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (unitsRes.data.Status) {
          setUnits(unitsRes.data.Result);
        }
        if (materialsRes.data.Status) {
          setMaterials(materialsRes.data.Result);
        }
        setDropdownsLoaded(true);
      } catch (err) {
        handleApiError(err, navigate, setAlert);
      }
    };

    if (isEditMode && !dropdownsLoaded) {
      fetchDropdownData();
    }
  }, [isEditMode, dropdownsLoaded]);

  // Add this function to handle the update
  const handleDisplayOrderUpdate = async (detail, newOrder) => {
    // Validate that we have all required data
    if (!detail || !detail.Id) {
      console.error("Missing detail Id:", detail);
      setAlert({
        show: true,
        title: "Error",
        message: "Error: Could not identify the order detail",
        type: "alert",
      });
      return;
    }

    // Validate that newOrder is a positive integer
    const orderNum = parseInt(newOrder);
    if (!Number.isInteger(orderNum) || orderNum <= 0) {
      setAlert({
        show: true,
        title: "Error",
        message: "Please enter a valid positive integer",
        type: "alert",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      console.log("Sending update request:", {
        orderId,
        detailId: detail.Id,
        newOrder: orderNum,
      });

      await axios.put(
        `${ServerIP}/auth/quote_detail_display_order/${orderId}/${detail.Id}`,
        { displayOrder: orderNum },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the order details
      fetchQuoteDetails();
      setEditingDisplayOrder(null);
      setTempDisplayOrder(null);
    } catch (err) {
      console.error("Error updating display order:", err);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update display order",
        type: "alert",
      });
    }
  };

  const handleClientChange = (e) => {
    const value = e.target.value.toUpperCase();
    const selectedClient = clients.find(
      (client) => client.clientName === value
    );

    setData((prev) => ({
      ...prev,
      clientId: selectedClient ? selectedClient.id : 0,
      clientName: value,
      customerName: selectedClient ? selectedClient.customerName : "",
      terms: selectedClient ? selectedClient.terms : "COD",
    }));

    // Clear the error when user types
    setError((prev) => ({
      ...prev,
      clientId: false,
    }));
  };

  useEffect(() => {
    // Fetch payment terms
    axios
      .get(`${ServerIP}/auth/payment_terms`)
      .then((result) => {
        if (result.data.Status) {
          setPaymentTerms(result.data.Result);
        }
      })
      .catch((err) => handleApiError(err, navigate, setAlert));
  }, []);

  const handlePrintQuote = () => {
    if (quoteDetails.length === 0) {
      setAlert({
        show: true,
        title: "Validation Error",
        message:
          "Cannot print order. No order details found. Please add order details first.",
        type: "alert",
      });
      return;
    }
    navigate(`/dashboard/print_quote/${id}`);
    //    window.open(`/dashboard/print_quote/${id}`, "_blank");
  };

  const updateTotalsToServer = async (totals) => {
    // Skip update if we're in initial load
    if (isInitialLoad) return;

    // Check if the totals have actually changed from last saved values
    if (!haveTotalsChanged(totals, lastSavedTotals)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${ServerIP}/auth/quotes/update_totals/${orderId || id}`,
        totals,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // After successful update, update the lastSavedTotals
      setLastSavedTotals(totals);
    } catch (error) {
      console.error("Error updating totals:", error);
      handleApiError(error, navigate, setAlert);
    }
  };

  // Add these handler functions
  const handleLoss = () => {
    const token = localStorage.getItem("token");
    axios
      .put(
        `${ServerIP}/auth/quote/status/${orderId || id}`,
        { status: "Loss" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        navigate("/dashboard/quotes");
      })
      .catch((err) => {
        console.error("Error updating quote status:", err);
      });
  };

  const handleMakeJO = () => {
    if (data.clientId === 0) {
      setAlert({
        show: true,
        title: "Client Required",
        message: "Please select an existing client or create a new one.",
        type: "confirm",
        confirmText: "Add New Client",
        cancelText: "Select Client",
        onConfirm: () => {
          navigate("/dashboard/client/add");
        },
        onCancel: () => {
          setAlert((prev) => ({ ...prev, show: false }));
        },
      });
      return;
    }

    // Show confirmation dialog before proceeding
    setAlert({
      show: true,
      title: "Confirmation",
      message: "Are you sure you want to convert this quote to a job order?",
      type: "confirm",
      onConfirm: () => {
        // Call the new backend endpoint that handles the entire conversion process
        const token = localStorage.getItem("token");
        const userName = localStorage.getItem("userName");
        const userId = currentUser.id;
        const quoteId = data.orderId;
        axios
          .post(
            `${ServerIP}/auth/quote-makeJO`,
            {
              quoteId,
              userId,
              userName,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          .then((result) => {
            if (result.data.Status) {
              const newOrderId =
                result.data.Result.orderId || result.data.Result;

              setAlert({
                show: true,
                title: "Success",
                message: `Quote successfully converted to Order #${newOrderId}\n\nClick Confirm to view the new order.\nClick Close to stay on this quote.`,
                type: "confirm",
                onConfirm: () => {
                  navigate(`/dashboard/orders/edit/${newOrderId}`);
                },
                onClose: () => {
                  window.location.reload();
                },
              });
            } else {
              setAlert({
                show: true,
                title: "Error",
                message:
                  result.data.Error || "Failed to convert quote to job order",
                type: "alert",
              });
            }
          })
          .catch((err) => {
            console.error("Error converting quote to job order:", err);
            setAlert({
              show: true,
              title: "Error",
              message: "Error converting quote to job order",
              type: "alert",
            });
          });
      },
    });
  };

  // Requote function to create a new quote from the current quote.
  const handleRequote = () => {
    const token = localStorage.getItem("token");
    const userName = localStorage.getItem("userName");
    const userId = currentUser.id;
    const quoteId = orderId || id;

    if (!quoteId) {
      setAlert({
        show: true,
        title: "Error",
        message: "Cannot requote: Quote ID not found",
        type: "alert",
      });
      return;
    }

    // Show confirmation dialog before proceeding
    setAlert({
      show: true,
      title: "Confirmation",
      message: "Are you sure you want to create a requote of this quote?",
      type: "confirm",
      onConfirm: () => {
        // Call the new backend endpoint that handles the entire requote process
        axios
          .post(
            `${ServerIP}/auth/quote-requote`,
            {
              quoteId,
              userId,
              userName,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          .then((result) => {
            if (result.data.Status) {
              const newQuoteId = result.data.Result;

              setAlert({
                show: true,
                title: "Success",
                message: `Quote successfully requoted with new Quote #${newQuoteId}\n\nClick Confirm to view the new quote.`,
                type: "confirm",
                onConfirm: () => {
                  navigate(`/dashboard/quotes/edit/${newQuoteId}`);
                },
              });
            } else {
              setAlert({
                show: true,
                title: "Error",
                message: result.data.Error || "Failed to create requote",
                type: "alert",
              });
            }
          })
          .catch((err) => {
            console.error("Error creating requote:", err);
            setAlert({
              show: true,
              title: "Error",
              message: "Error creating requote",
              type: "alert",
            });
          });
      },
    });
  };

  // Add this helper function
  const canEdit = () => {
    return data.status === "Open" || currentUser.category_id === 1;
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
    <div className="quote">
      <div className="px-4 mt-3 quote-page-background">
        <div className="p-3 rounded quote-form-container">
          <div className="quote-section-header d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <h3 className="m-0">
                {id ? `Edit Quote #${data.orderId}` : "Add New Quote"}
              </h3>
            </div>
            <div className="d-flex gap-2">
              <>
                <Button variant="delete" onClick={handleLoss}>
                  Loss
                </Button>
                <Button variant="save" onClick={handleMakeJO}>
                  Make JO
                </Button>
                <Button variant="warning" onClick={handleRequote}>
                  Requote
                </Button>
              </>
              <Button variant="print" onClick={handlePrintQuote}>
                Print Quote
              </Button>
              {canEdit() && (
                <Button variant="save" onClick={handleSubmit}>
                  {isHeaderSaved ? "Save Edit" : "Save Quote"}
                </Button>
              )}
              <Button variant="cancel" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="d-flex">
            <form
              className="row g-1 flex-grow-1"
              role="form"
              aria-label="Add New Quote"
              onSubmit={handleSubmit}
              style={{ marginTop: "-0.8rem" }}
            >
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label htmlFor="quoteDate" className="form-label">
                    Quote Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    id="quoteDate"
                    value={data.quoteDate || ""}
                    onChange={(e) =>
                      setData({ ...data, quoteDate: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label htmlFor="preparedBy" className="form-label">
                    Prepared By
                  </label>
                  <Dropdown
                    className={"form-input"}
                    variant="form"
                    id="preparedBy"
                    value={data.preparedBy}
                    onChange={(e) =>
                      setData({ ...data, preparedBy: e.target.value })
                    }
                    options={salesEmployees}
                    disabled={!isEditMode || !canEdit()}
                    placeholder=""
                  />
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label htmlFor="terms" className="form-label">
                    Terms
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    id="terms"
                    value={data.terms || ""}
                    readOnly
                    tabIndex="-1"
                  />
                </div>
              </div>

              <div className="col-4">
                <div className="d-flex flex-column">
                  <label
                    htmlFor="clientId"
                    className={`form-label`}
                    style={getClientBackgroundStyle(data)}
                  >
                    Client <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={"form-input"}
                    id="clientId"
                    list="clientList"
                    value={data.clientName || ""}
                    onChange={handleClientChange}
                    disabled={!isEditMode || !canEdit()}
                    onMouseEnter={() => handleClientHover(data.clientId)}
                    onMouseLeave={handleClientLeave}
                  />
                  <datalist id="clientList">
                    {clients.map((client) => (
                      <option key={client.id} value={client.clientName}>
                        {client.customerName}
                      </option>
                    ))}
                  </datalist>
                  {error.clientId && (
                    <div className="invalid-feedback">Client is required</div>
                  )}
                </div>
              </div>
              <div className="col-8">
                <div className="d-flex flex-column">
                  <label
                    htmlFor="customerName"
                    className="form-label"
                    style={getClientBackgroundStyle(data)}
                  >
                    Customer Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    id="customerName"
                    value={data.customerName || ""}
                    readOnly
                    tabIndex="-1"
                  />
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label htmlFor="projectName" className="form-label">
                    Project Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${
                      error.projectName ? "is-invalid" : ""
                    }`}
                    id="projectName"
                    value={data.projectName}
                    onChange={(e) =>
                      setData({ ...data, projectName: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                  {error.projectName && (
                    <div className="invalid-feedback">
                      Project Name is required
                    </div>
                  )}
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label htmlFor="orderedBy" className="form-label">
                    Ordered By
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    id="orderedBy"
                    value={data.orderedBy || ""}
                    onChange={(e) =>
                      setData({ ...data, orderedBy: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label htmlFor="dueDate" className="form-label">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    id="dueDate"
                    value={data.dueDate || ""}
                    onChange={(e) =>
                      setData({ ...data, dueDate: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-3">
                <div className="d-flex flex-column">
                  <label htmlFor="deliveryRemarks" className="form-label">
                    Delivery
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    id="deliveryRemarks"
                    value={data.deliveryRemarks || ""}
                    onChange={(e) =>
                      setData({ ...data, deliveryRemarks: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-3">
                <div className="d-flex flex-column">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    id="email"
                    value={data.email || ""}
                    onChange={(e) =>
                      setData({ ...data, email: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-3">
                <div className="d-flex flex-column">
                  <label htmlFor="cellNumber" className="form-label">
                    Cell Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    id="cellNumber"
                    value={data.cellNumber || ""}
                    onChange={(e) =>
                      setData({ ...data, cellNumber: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-3">
                <div className="d-flex flex-column">
                  <label htmlFor="telNum" className="form-label">
                    Telephone Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    id="telNum"
                    value={data.telNum || ""}
                    onChange={(e) =>
                      setData({ ...data, telNum: e.target.value })
                    }
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
            </form>

            <div className="right-panel">
              <div className="right-panel-content">
                <div className="info-group">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="info-label mb-0">Status:</div>
                    <span
                      className={`status-badge ${data.status || "default"}`}
                    >
                      {data.status || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="info-group">
                  <div className="info-label">Edited By</div>
                  <div className="info-value">{data.editedBy || "-"}</div>
                </div>

                <div className="info-group">
                  <div className="info-label">Last Edited</div>
                  <div className="info-value">
                    {data.lastEdited
                      ? new Date(data.lastEdited)
                          .toLocaleString("en-CA", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                          .replace(",", "")
                      : "-"}
                  </div>
                </div>

                <div className="info-group">
                  <div className="info-label">Total Hours</div>
                  <div className="info-value">
                    {formatNumber(data.totalHrs) || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isHeaderSaved && (
            <div className="mt-4">
              <h5 className="m-0">Quote Details List</h5>
              <table className="table detail table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Qty</th>
                    <th>Width</th>
                    <th>Height</th>
                    <th>Unit</th>
                    <th>Material</th>
                    <th>Description</th>
                    <th>Per Sq Ft</th>
                    <th>Price</th>
                    <th>Disc%</th>
                    <th>Amount</th>
                    <th>Mat Usage</th>
                    <th>Print Hrs</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteDetails.map((detail, index) => (
                    <tr
                      key={`${detail.quoteId}_${detail.displayOrder}_${index}`}
                    >
                      {editingRowId ===
                      `${detail.quoteId}_${detail.displayOrder}` ? (
                        <>
                          <td className="centered-cell">
                            {detail.displayOrder}
                          </td>
                          <td style={{ width: "60px" }}>
                            <input
                              type="text"
                              className="form-input detail text-center"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.quantity || detail.quantity
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, "");
                                if (!isNaN(value)) {
                                  handleDetailInputChange(
                                    `${detail.quoteId}_${detail.displayOrder}`,
                                    "quantity",
                                    value
                                  );
                                }
                              }}
                            />
                          </td>
                          <td style={{ width: "60px" }}>
                            <input
                              type="number"
                              className="form-input detail text-center"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.width || detail.width
                              }
                              onChange={(e) =>
                                handleDetailInputChange(
                                  `${detail.quoteId}_${detail.displayOrder}`,
                                  "width",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td style={{ width: "60px" }}>
                            <input
                              type="number"
                              className="form-input detail text-center"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.height || detail.height
                              }
                              onChange={(e) =>
                                handleDetailInputChange(
                                  `${detail.quoteId}_${detail.displayOrder}`,
                                  "height",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <Dropdown
                              variant="table"
                              className="form-input detail"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.unit ||
                                detail.unit ||
                                ""
                              }
                              onChange={(e) =>
                                handleDetailInputChange(
                                  `${detail.quoteId}_${detail.displayOrder}`,
                                  "unit",
                                  e.target.value
                                )
                              }
                              options={units}
                              placeholder="Unit"
                              labelKey="unit"
                              valueKey="unit"
                            />
                          </td>
                          <td>
                            <Dropdown
                              variant="table"
                              className="form-input detail"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.material ||
                                detail.material ||
                                ""
                              }
                              onChange={(e) =>
                                handleDetailInputChange(
                                  `${detail.quoteId}_${detail.displayOrder}`,
                                  "material",
                                  e.target.value
                                )
                              }
                              options={materials}
                              placeholder="Material"
                              labelKey="Material"
                              valueKey="Material"
                            />
                          </td>
                          <td>
                            <textarea
                              className="form-input detail"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.itemDescription || detail.itemDescription
                              }
                              onChange={(e) => {
                                handleDetailInputChange(
                                  `${detail.quoteId}_${detail.displayOrder}`,
                                  "itemDescription",
                                  e.target.value
                                );
                                e.target.style.height = "31px";
                                e.target.style.height =
                                  e.target.scrollHeight + "px";
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.shiftKey) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const cursorPosition =
                                    e.target.selectionStart;
                                  const currentValue = e.target.value;
                                  const newValue =
                                    currentValue.substring(0, cursorPosition) +
                                    "\n" +
                                    currentValue.substring(cursorPosition);

                                  handleDetailInputChange(
                                    `${detail.quoteId}_${detail.displayOrder}`,
                                    "itemDescription",
                                    newValue
                                  );

                                  // Set cursor position after the inserted newline and ensure focus stays on the textarea
                                  setTimeout(() => {
                                    e.target.focus();
                                    e.target.selectionStart =
                                      cursorPosition + 1;
                                    e.target.selectionEnd = cursorPosition + 1;
                                    // Adjust height after adding new line
                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                      e.target.scrollHeight + "px";
                                  }, 0);
                                  return false;
                                }
                              }}
                              rows="1"
                            />
                          </td>
                          <td style={{ width: "70px" }}>
                            <input
                              type="text"
                              className="form-input detail text-end"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.persqft || detail.persqft
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^\d.-]/g,
                                  ""
                                );
                                if (!isNaN(value)) {
                                  handleDetailInputChange(
                                    `${detail.quoteId}_${detail.displayOrder}`,
                                    "persqft",
                                    value
                                  );
                                }
                              }}
                            />
                          </td>
                          <td style={{ width: "100px" }}>
                            <input
                              type="text"
                              className="form-input detail text-end"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.unitPrice || detail.unitPrice
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^\d.-]/g,
                                  ""
                                );
                                if (!isNaN(value)) {
                                  handleDetailInputChange(
                                    `${detail.quoteId}_${detail.displayOrder}`,
                                    "unitPrice",
                                    value
                                  );
                                }
                              }}
                            />
                          </td>
                          <td style={{ width: "60px" }}>
                            <input
                              type="text"
                              className="form-input detail text-end"
                              value={
                                editedValues[
                                  `${detail.quoteId}_${detail.displayOrder}`
                                ]?.discount || detail.discount
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^\d.-]/g,
                                  ""
                                );
                                if (!isNaN(value)) {
                                  handleDetailInputChange(
                                    `${detail.quoteId}_${detail.displayOrder}`,
                                    "discount",
                                    value
                                  );
                                }
                              }}
                            />
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(
                              editedValues[
                                `${detail.quoteId}_${detail.displayOrder}`
                              ]?.amount || detail.amount
                            )}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.materialUsage)}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.printHours)}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              {canEdit() && (
                                <>
                                  <Button
                                    variant="save"
                                    iconOnly
                                    size="sm"
                                    onClick={() =>
                                      handleSaveDetail(
                                        `${detail.quoteId}_${detail.displayOrder}`
                                      )
                                    }
                                  />
                                  <Button
                                    variant="cancel"
                                    iconOnly
                                    size="sm"
                                    onClick={() => {
                                      setEditingRowId(null);
                                      setEditedValues({});
                                      setEditErrors({});
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ width: "40px" }}>
                            {editingDisplayOrder ===
                            `${detail.quoteId}_${detail.displayOrder}` ? (
                              <input
                                type="number"
                                className="form-input detail"
                                value={tempDisplayOrder || ""}
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^0-9]/g,
                                    ""
                                  );
                                  setTempDisplayOrder(value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Tab") {
                                    e.preventDefault();
                                    handleDisplayOrderUpdate(
                                      detail,
                                      tempDisplayOrder
                                    );
                                  }
                                }}
                                onBlur={() => {
                                  handleDisplayOrderUpdate(
                                    detail,
                                    tempDisplayOrder
                                  );
                                }}
                                autoFocus
                                min="1"
                                step="1"
                              />
                            ) : (
                              <div
                                className="centered-cell"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDisplayOrder(
                                    `${detail.quoteId}_${detail.displayOrder}`
                                  );
                                  setTempDisplayOrder(detail.displayOrder);
                                }}
                              >
                                {detail.displayOrder}
                              </div>
                            )}
                          </td>
                          <td className="centered-cell">
                            {Number(detail.quantity).toLocaleString()}
                          </td>
                          <td className="centered-cell">{detail.width}</td>
                          <td className="centered-cell">{detail.height}</td>
                          <td className="centered-cell">{detail.unit}</td>
                          <td className="centered-cell">{detail.material}</td>
                          <td style={{ whiteSpace: "pre-line" }}>
                            {detail.itemDescription}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.persqft)}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.unitPrice)}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.discount)}
                          </td>
                          <td className="numeric-cell">
                            {formatPeso(detail.amount)}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.materialUsage)}
                          </td>
                          <td className="numeric-cell">
                            {formatNumber(detail.printHours)}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              {canEdit() && (
                                <>
                                  <Button
                                    variant="edit"
                                    iconOnly
                                    size="sm"
                                    onClick={() =>
                                      handleEditClick(
                                        `${detail.quoteId}_${detail.displayOrder}`,
                                        detail
                                      )
                                    }
                                  />
                                  <Button
                                    variant="delete"
                                    iconOnly
                                    size="sm"
                                    onClick={() => {
                                      console.log(
                                        "Detail click ID:",
                                        detail.Id
                                      );
                                      handleDeleteDetail(detail.Id);
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid lightgrey" }}>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="text-end pe-2 form-amount-label">
                      Subtotal:
                    </td>
                    <td className="numeric-cell">
                      {formatPeso(data.totalAmount)}
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="text-end pe-2 form-amount-label">
                      Disc. Amount:
                    </td>
                    <td className="numeric-cell">
                      <input
                        type="number"
                        className="form-input detail text-end"
                        value={data.amountDiscount}
                        onChange={(e) =>
                          handleDiscountChange("amount", e.target.value)
                        }
                        style={{ width: "100px", display: "inline-block" }}
                        disabled={!canEdit()}
                      />
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="text-end pe-2 form-amount-label">
                      Percent Disc.
                    </td>
                    <td className="numeric-cell">
                      <input
                        type="number"
                        className="form-input detail text-end"
                        value={data.percentDisc}
                        onChange={(e) =>
                          handleDiscountChange("percent", e.target.value)
                        }
                        style={{ width: "100px", display: "inline-block" }}
                        disabled={!canEdit()}
                      />
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="text-end pe-2 form-amount-label">
                      Grand Total:
                    </td>
                    <td className="numeric-cell">
                      {formatPeso(data.grandTotal)}
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isHeaderSaved && canEdit() && (
          <div className="mt-4">
            <div className="quote-details-header">
              <h5 className="m-0">Add Quote Details</h5>
            </div>
            <AddQuoteDetails
              quoteId={orderId}
              onDetailAdded={handleDetailAdded}
            />
          </div>
        )}

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
          onCancel={() => {
            if (alert.onCancel) {
              alert.onCancel();
            }
            setAlert((prev) => ({ ...prev, show: false }));
          }}
          confirmText={alert.confirmText}
          cancelText={alert.cancelText}
        />

        <ViewCustomerInfo
          clientId={selectedClientId}
          show={showClientInfo}
          onClose={() => setShowClientInfo(false)}
        />
      </div>
    </div>
  );
}

export default AddQuote;
