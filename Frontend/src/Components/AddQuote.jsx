import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AddQuoteDetails from "./AddQuoteDetails";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { BiRectangle } from "react-icons/bi";
import "./Quotes.css";
import {
  validateDetail,
  calculateArea,
  calculatePrice,
  calculateAmount,
  formatNumber,
  handleApiError,
  calculateTotals,
  calculatePerSqFt,
  calculatePrintHrs,
} from "../utils/orderUtils";
import Modal from "./UI/Modal";
import Input from "./UI/Input";
import { ServerIP } from "../config";
import { debounce } from "lodash";

function AddQuote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [currentUser, setCurrentUser] = useState({});
  const [clients, setClients] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const [artists, setArtists] = useState([]);
  const [error, setError] = useState({
    clientId: false,
    projectName: false,
    preparedBy: false,
    graphicsBy: false,
  });

  const [data, setData] = useState({
    clientId: "",
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
          handleApiError(error, navigate);
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
        subtotal > 0 ? Math.min((newDiscAmount / subtotal) * 100, 99.99) : 0;
      newGrandTotal = Number(subtotal - newDiscAmount).toFixed(2);
    }

    const newTotals = {
      totalAmount: Number(subtotal).toFixed(2),
      amountDiscount: newDiscAmount,
      percentDisc: newPercentDisc,
      grandTotal: Number(newGrandTotal).toFixed(2),
      totalHrs: data.totalHrs,
      editedBy: currentUser.name,
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
        }
      })
      .catch((err) => console.log(err));

    axios
      .get(`${ServerIP}/auth/sales_employees`, config)
      .then((result) => {
        if (result.data.Status) {
          setSalesEmployees(result.data.Result);
        }
      })
      .catch((err) => console.log(err));

    axios
      .get(`${ServerIP}/auth/artists`, config)
      .then((result) => {
        if (result.data.Status) {
          setArtists(result.data.Result);
        }
      })
      .catch((err) => console.log(err));

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
      console.log("Fetching quote with ID:", id);
      const token = localStorage.getItem("token");
      setIsInitialLoad(true);
      axios
        .get(`${ServerIP}/auth/quote/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((result) => {
          console.log("Quote fetch result:", result.data);
          if (result.data.Status) {
            const quoteData = result.data.Result;
            console.log("Raw quote data:", quoteData);

            // Set all the data at once with proper type conversion
            const initialData = {
              clientId: parseInt(quoteData.clientId),
              projectName: quoteData.projectName || "",
              preparedBy: parseInt(quoteData.preparedBy),
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
              status: quoteData.status || "Open",
            };

            console.log("Setting initial data with proper types:", initialData);
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
          handleApiError(err, navigate);
        });
    }
  }, [id, navigate]);

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
      handleApiError(err, navigate);
    }
  };

  const handleSubmit = (e, isPrintAction = false) => {
    e?.preventDefault();

    // Validate required fields
    const newError = {};
    if (!data.clientId) newError.clientId = true;
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
      editedBy: decoded.name,
      lastEdited: currentDateTime,
      status: data.status,
      terms: data.terms || null,
    };

    console.log("Quote data being sent:", dataToSend);

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
            alert(result.data.Error || "Failed to save quote");
          }
        })
        .catch((err) => {
          console.error("Error saving quote:", err);
          handleApiError(err, navigate);
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
            alert(result.data.Error || "Failed to update quote");
          }
        })
        .catch((err) => {
          console.error("Error updating quote:", err);
          handleApiError(err, navigate);
        });
    }
  };

  const handleError = (err) => {
    if (
      err.response?.status === 401 ||
      err.response?.data?.Error?.includes("jwt expired") ||
      err.response?.data?.Error?.includes("invalid token")
    ) {
      alert("Your session has expired. Please log out and log in again.");
      localStorage.removeItem("token");
      navigate("/");
    } else {
      alert(err.response?.data?.Error || "An error occurred");
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

    const currentPercentDisc = preserveDiscounts
      ? parseFloat(data.percentDisc || 0)
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

        const newTotals = {
          totalAmount: totals.subtotal,
          amountDiscount: data.amountDiscount,
          percentDisc: data.percentDisc,
          grandTotal: totals.grandTotal,
          totalHrs: totals.totalHrs,
          editedBy: currentUser.name,
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

  const handleDeleteDetail = (uniqueId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    const token = localStorage.getItem("token");
    const [quoteId, displayOrder] = uniqueId.split("_");

    const updatedDetails = quoteDetails.filter(
      (detail) =>
        !(
          detail.quoteId === parseInt(quoteId) &&
          detail.displayOrder === parseInt(displayOrder)
        )
    );

    const totals = calculateQuoteTotals(updatedDetails);

    Promise.all([
      axios.delete(`${ServerIP}/auth/quote_detail/${quoteId}/${displayOrder}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([detailResult]) => {
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
            editedBy: currentUser.name,
          });
        } else {
          alert(detailResult.data.Error);
        }
      })
      .catch((err) => handleApiError(err, navigate));
  };

  const handleEditClick = (uniqueId, detail) => {
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

    console.log("Edited detail being set:", editedDetail);
    console.log("persqft in edited detail:", editedDetail.persqft);

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
      editedBy: currentUser.name,
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
      editedBy: currentUser.name,
    }).then(() => {
      navigate("/dashboard/quotes");
    });
  };

  const labelStyle = {
    fontSize: "0.9rem",
    marginBottom: "0.01rem",
    marginTop: "0.3rem",
  };

  const inputStyle = {
    fontSize: "0.9rem",
  };

  const dateTimeStyle = {
    ...inputStyle,
    color: "black",
  };

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
          if (updatedDetail.persqft) {
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
        if (updatedDetail.squareFeet) {
          const perSqFt = calculatePerSqFt(value, updatedDetail.squareFeet);
          updatedDetail.persqft = perSqFt.toFixed(2);
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
    try {
      const [quoteId, displayOrder] = uniqueId.split("_");
      const editedDetail = editedValues[uniqueId];

      if (!editedDetail) {
        console.error("No edited values found for:", uniqueId);
        return;
      }

      console.log("Saving detail with values:", editedDetail);

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
        printHours: editedDetail.printHours || 0,
      };

      console.log("Data being sent to server:", dataToSend);

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

          // Calculate new totals using the new function
          const totals = calculateQuoteTotals(updatedDetails);

          // Update quote totals in the database
          const quoteUpdateResponse = await axios.put(
            `${ServerIP}/auth/update_quote/${quoteId}`,
            {
              ...data,
              totalAmount: totals.subtotal,
              amountDiscount: totals.amountDiscount,
              percentDisc: totals.percentDisc,
              grandTotal: totals.grandTotal,
              totalHrs: totals.totalHrs,
              editedBy: currentUser.name,
              lastEdited: new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " "),
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (quoteUpdateResponse.data.Status) {
            // Update local state
            setData((prev) => ({
              ...prev,
              totalAmount: totals.subtotal,
              amountDiscount: totals.amountDiscount,
              percentDisc: totals.percentDisc,
              grandTotal: totals.grandTotal,
              totalHrs: totals.totalHrs,
            }));
          }
        }

        setEditingRowId(null);
        setEditedValues({});
      }
    } catch (error) {
      console.error("Error updating quote detail:", error);
      alert("Error updating quote detail: " + error.message);
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
        handleApiError(err, navigate);
      }
    };

    if (isEditMode && !dropdownsLoaded) {
      fetchDropdownData();
    }
  }, [isEditMode, dropdownsLoaded]);

  // Add this function to handle the update
  const handleDisplayOrderUpdate = async (detail, newOrder) => {
    console.log("Detail object:", detail);

    // Validate that we have all required data
    if (!detail || !detail.Id) {
      console.error("Missing detail Id:", detail);
      alert("Error: Could not identify the order detail");
      return;
    }

    // Validate that newOrder is a positive integer
    const orderNum = parseInt(newOrder);
    if (!Number.isInteger(orderNum) || orderNum <= 0) {
      alert("Please enter a valid positive integer");
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
      alert("Failed to update display order");
    }
  };

  const handleClientChange = (clientId) => {
    // Convert clientId to number since select values are strings
    const id = parseInt(clientId);
    setData((prev) => ({ ...prev, clientId: id }));

    const token = localStorage.getItem("token");

    // Fetch complete client data
    axios
      .get(`${ServerIP}/auth/client/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((result) => {
        if (result.data.Status) {
          const clientData = result.data.Result;
          console.log("Complete client data:", clientData);
          setData((prev) => ({
            ...prev,
            clientId: id,
            terms: clientData.terms,
          }));
        }
      })
      .catch((err) => handleApiError(err, navigate));
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
      .catch((err) => handleApiError(err, navigate));
  }, []);

  const handlePrintQuote = () => {
    if (quoteDetails.length === 0) {
      window.alert(
        "Cannot print order. No order details found. Please add order details first."
      );
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
      handleApiError(error, navigate);
    }
  };

  // Add a format function for display
  const formatDisplay = (number) => {
    return Number(number).toFixed(2);
  };

  return (
    <div className="px-4 mt-3 quote-page-background">
      <div className="p-3 rounded quote-form-container">
        <div className="quote-section-header d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <h3 className="m-0">
              {id ? `Edit Quote #${data.orderId}` : "Add New Quote"}
            </h3>
          </div>
          <div className="d-flex gap-2">
            <Button variant="print" onClick={handlePrintQuote} disabled={!id}>
              Print Quote
            </Button>
            <Button variant="save" onClick={handleSubmit}>
              {isHeaderSaved ? "Finish Edit" : "Save Quote"}
            </Button>
            <Button variant="cancel" onClick={handleNavigation}>
              Cancel
            </Button>
          </div>
        </div>

        <div className="d-flex">
          <form
            className="row g-1 flex-grow-1"
            onSubmit={handleSubmit}
            style={{ marginTop: "-0.8rem" }}
          >
            <div className="col-4">
              <div className="d-flex flex-column">
                <label
                  htmlFor="quoteDate"
                  className="form-label"
                  style={labelStyle}
                >
                  Quote Date
                </label>
                <input
                  type="date"
                  className="form-control rounded-0"
                  id="quoteDate"
                  style={dateTimeStyle}
                  value={data.quoteDate || ""}
                  onChange={(e) =>
                    setData({ ...data, quoteDate: e.target.value })
                  }
                  disabled={!isEditMode}
                />
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label
                  htmlFor="preparedBy"
                  className="form-label"
                  style={labelStyle}
                >
                  Prepared By
                </label>
                <Dropdown
                  variant="form"
                  id="preparedBy"
                  value={data.preparedBy}
                  onChange={(e) =>
                    setData({ ...data, preparedBy: e.target.value })
                  }
                  options={salesEmployees}
                  disabled={!isEditMode}
                  placeholder=""
                />
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label
                  htmlFor="terms"
                  className="form-label"
                  style={labelStyle}
                >
                  Terms
                </label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  id="terms"
                  style={inputStyle}
                  value={data.terms || ""}
                  readOnly
                />
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex flex-column">
                <label
                  htmlFor="clientId"
                  className="form-label"
                  style={labelStyle}
                >
                  Client <span className="text-danger">*</span>
                </label>
                <Dropdown
                  variant="form"
                  id="clientId"
                  value={data.clientId || ""}
                  onChange={(e) => handleClientChange(e.target.value)}
                  options={clients}
                  disabled={!isEditMode}
                  error={error.clientId}
                  required
                  placeholder=""
                  labelKey="clientName"
                />
                {error.clientId && (
                  <div className="invalid-feedback">Client is required</div>
                )}
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex flex-column">
                <label
                  htmlFor="projectName"
                  className="form-label"
                  style={labelStyle}
                >
                  Project Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control rounded-0 ${
                    error.projectName ? "is-invalid" : ""
                  }`}
                  id="projectName"
                  style={inputStyle}
                  value={data.projectName}
                  onChange={(e) =>
                    setData({ ...data, projectName: e.target.value })
                  }
                  disabled={!isEditMode}
                />
                {error.projectName && (
                  <div className="invalid-feedback">
                    Project Name is required
                  </div>
                )}
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex flex-column">
                <label
                  htmlFor="orderedBy"
                  className="form-label"
                  style={labelStyle}
                >
                  Ordered By
                </label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  id="orderedBy"
                  style={inputStyle}
                  value={data.orderedBy || ""}
                  onChange={(e) =>
                    setData({ ...data, orderedBy: e.target.value })
                  }
                  disabled={!isEditMode}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex flex-column">
                <label
                  htmlFor="dueDate"
                  className="form-label"
                  style={labelStyle}
                >
                  Due Date
                </label>
                <input
                  type="date"
                  className="form-control rounded-0"
                  id="dueDate"
                  style={dateTimeStyle}
                  value={data.dueDate || ""}
                  onChange={(e) =>
                    setData({ ...data, dueDate: e.target.value })
                  }
                  disabled={!isEditMode}
                />
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label
                  htmlFor="email"
                  className="form-label"
                  style={labelStyle}
                >
                  Email
                </label>
                <input
                  type="email"
                  className="form-control rounded-0"
                  id="email"
                  style={inputStyle}
                  value={data.email || ""}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  disabled={!isEditMode}
                />
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label
                  htmlFor="cellNumber"
                  className="form-label"
                  style={labelStyle}
                >
                  Cell Number
                </label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  id="cellNumber"
                  style={inputStyle}
                  value={data.cellNumber || ""}
                  onChange={(e) =>
                    setData({ ...data, cellNumber: e.target.value })
                  }
                  disabled={!isEditMode}
                />
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label
                  htmlFor="telNum"
                  className="form-label"
                  style={labelStyle}
                >
                  Telephone Number
                </label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  id="telNum"
                  style={inputStyle}
                  value={data.telNum || ""}
                  onChange={(e) => setData({ ...data, telNum: e.target.value })}
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </form>

          <div
            className="ms-3"
            style={{ width: "250px", marginTop: "-0.8rem" }}
          >
            <div className="border rounded p-3">
              <div className="mb-2">
                <small className="text-muted">Edited By</small>
                <div>{data.editedBy || "-"}</div>
              </div>

              <div className="mb-2">
                <small className="text-muted">Last Edited</small>
                <div>
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

              <div className="mb-2">
                <small className="text-muted">Total Hours</small>
                <div>{formatNumber(data.totalHrs) || "-"}</div>
              </div>
            </div>
          </div>
        </div>

        {isHeaderSaved && (
          <div className="mt-4">
            <div className="quote-details-header">
              <h5 className="m-0">Quote Details List</h5>
            </div>
            <table className="quote-table table table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="text-center">Qty</th>
                  <th className="text-center">Width</th>
                  <th className="text-center">Height</th>
                  <th className="text-center">Unit</th>
                  <th className="text-center">Material</th>
                  <th className="text-center">Per Sq Ft</th>
                  <th>Description</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Disc%</th>
                  <th className="text-end">Amount</th>
                  <th className="text-center">Mat Usage</th>
                  <th className="text-center">Print Hrs</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {quoteDetails.map((detail, index) => (
                  <tr key={`${detail.quoteId}_${detail.displayOrder}_${index}`}>
                    {editingRowId ===
                    `${detail.quoteId}_${detail.displayOrder}` ? (
                      <>
                        <td style={{ width: "40px" }}>{detail.displayOrder}</td>
                        <td style={{ width: "60px" }}>
                          <input
                            type="text"
                            className="form-control form-control-sm text-center"
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
                            className="form-control form-control-sm text-center"
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
                            className="form-control form-control-sm text-center"
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
                            className="text-center"
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
                            className="text-center"
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
                        <td style={{ width: "70px" }}>
                          <input
                            type="text"
                            className="form-control form-control-sm text-center"
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
                        <td>
                          <textarea
                            className="form-control form-control-sm description-input"
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
                            rows="1"
                          />
                        </td>
                        <td style={{ width: "100px" }}>
                          <input
                            type="text"
                            className="form-control form-control-sm price-input"
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
                            className="form-control form-control-sm discount-input"
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
                          {formatDisplay(
                            editedValues[
                              `${detail.quoteId}_${detail.displayOrder}`
                            ]?.amount || detail.amount
                          )}
                        </td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.materialUsage)}
                        </td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.printHours)}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
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
                              className="form-control form-control-sm display-order-input"
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
                            <span
                              className="display-order-text"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingDisplayOrder(
                                  `${detail.quoteId}_${detail.displayOrder}`
                                );
                                setTempDisplayOrder(detail.displayOrder);
                              }}
                            >
                              {detail.displayOrder}
                            </span>
                          )}
                        </td>
                        <td className="centered-cell">
                          {Number(detail.quantity).toLocaleString()}
                        </td>
                        <td className="centered-cell">{detail.width}</td>
                        <td className="centered-cell">{detail.height}</td>
                        <td className="centered-cell">{detail.unit}</td>
                        <td className="centered-cell">{detail.material}</td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.persqft)}
                        </td>
                        <td>{detail.itemDescription}</td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.unitPrice)}
                        </td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.discount)}
                        </td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.amount)}
                        </td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.materialUsage)}
                        </td>
                        <td className="numeric-cell">
                          {formatDisplay(detail.printHours)}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
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
                              onClick={() =>
                                handleDeleteDetail(
                                  `${detail.quoteId}_${detail.displayOrder}`
                                )
                              }
                            />
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
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
                  <td className="text-end pe-2">Subtotal:</td>
                  <td className="numeric-cell">
                    {formatDisplay(data.totalAmount)}
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
                  <td className="text-end pe-2 nowrap">Disc. Amount:</td>
                  <td className="numeric-cell">
                    <input
                      type="number"
                      className="form-control form-control-sm text-end"
                      value={data.amountDiscount}
                      onChange={(e) =>
                        handleDiscountChange("amount", e.target.value)
                      }
                      style={{ width: "100px", display: "inline-block" }}
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
                  <td className="text-end pe-2">Percent Disc.:</td>
                  <td className="numeric-cell">
                    <input
                      type="number"
                      className="form-control form-control-sm text-end"
                      value={data.percentDisc}
                      onChange={(e) =>
                        handleDiscountChange("percent", e.target.value)
                      }
                      style={{ width: "100px", display: "inline-block" }}
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
                  <td className="text-end pe-2">Grand Total:</td>
                  <td className="numeric-cell">
                    {formatDisplay(data.grandTotal)}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isHeaderSaved && (
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
    </div>
  );
}

export default AddQuote;
