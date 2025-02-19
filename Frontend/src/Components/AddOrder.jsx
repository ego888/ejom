import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AddOrderDetails from "./AddOrderDetails";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { BiRectangle } from "react-icons/bi";
import "./AddOrder.css"; // Import the CSS file
import "./Orders.css";
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
import ModalAlert from "./UI/ModalAlert";
import axios from "../utils/axiosConfig"; // Import configured axios
import StatusDropdown from "./UI/StatusDropdown";
import Dropdown2 from "./UI/Dropdown2";

function AddOrder() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get the order ID from URL if it exists
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
    orderDate: new Date().toISOString().split("T")[0],
    orderedBy: "",
    orderReference: "",
    cellNumber: "",
    status: "Open",
    specialInst: "",
    deliveryInst: "",
    graphicsBy: "",
    dueDate: "",
    dueTime: "",
    sample: false,
    reprint: false,
  });

  const [orderDetails, setOrderDetails] = useState([]);
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

  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    grandTotal: 0,
  });

  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    discAmount: data.amountDisc || 0,
    percentDisc: data.percentDisc || 0,
    grandTotal: data.grandTotal || 0,
  });

  const [editingDisplayOrder, setEditingDisplayOrder] = useState(null);
  const [tempDisplayOrder, setTempDisplayOrder] = useState(null);

  const [paymentTerms, setPaymentTerms] = useState([]);

  const [showAllowanceTooltip, setShowAllowanceTooltip] = useState(false);
  const [tooltipDetail, setTooltipDetail] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  const statusOptions = [
    "Open",
    "Printed",
    "Prod",
    "Finished",
    "Delivered",
    "Billed",
    "Closed",
    "Cancel",
  ];

  const canEdit = () => {
    if (adminOverride && isAdmin) return true;
    return data.status === "Open" || currentUser.category_id === 1;
  };

  const handleDiscountChange = (type, value) => {
    const subtotal = orderDetails.reduce(
      (sum, detail) => sum + parseFloat(detail.amount || 0),
      0
    );
    let newDiscAmount, newPercentDisc, newGrandTotal;

    if (type === "amount") {
      newDiscAmount = parseFloat(value) || 0;
      // Ensure discount amount doesn't exceed subtotal
      newDiscAmount = Math.min(newDiscAmount, subtotal);
      newPercentDisc =
        subtotal > 0 ? ((newDiscAmount / subtotal) * 100).toFixed(2) : 0;
      newGrandTotal = subtotal - newDiscAmount;
    } else {
      newPercentDisc = parseFloat(value) || 0;
      // Ensure percent discount doesn't exceed 100%
      newPercentDisc = Math.min(newPercentDisc, 100);
      newDiscAmount = ((subtotal * newPercentDisc) / 100).toFixed(2);
      newGrandTotal = subtotal - newDiscAmount;
    }

    const newTotals = {
      subtotal,
      discAmount: parseFloat(newDiscAmount),
      percentDisc: parseFloat(newPercentDisc),
      grandTotal: parseFloat(newGrandTotal),
    };

    setOrderTotals(newTotals);

    // Update the main data state for saving to database
    setData((prev) => ({
      ...prev,
      amountDisc: newDiscAmount,
      percentDisc: newPercentDisc,
      grandTotal: newGrandTotal,
    }));
  };

  const fetchOrderDetails = () => {
    if (!orderId && !id) return; // Check for both orderId and route id

    const token = localStorage.getItem("token");
    axios
      .get(`${ServerIP}/auth/order_details/${orderId || id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((result) => {
        if (result.data.Status) {
          setOrderDetails(result.data.Result);
          const totals = calculateTotals(result.data.Result);
          setTotals(totals);
        }
      })
      .catch((err) => console.log(err));
  };

  // const fetchClients = async () => {
  //   try {
  //     const response = await axios.get(`${ServerIP}/auth/client-customer`);
  //     if (response.data.Status) {
  //       const result = response.data.Result || [];
  //       setClients(result);
  //     } else {
  //       setAlert({
  //         show: true,
  //         title: "Error",
  //         message: response.data.Error,
  //         type: "alert",
  //       });
  //     }
  //   } catch (error) {
  //     handleApiError(error, setAlert);
  //   }
  // };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // Update all axios calls to use config
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
    console.log("Clients:", clients);
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

    // Set current user
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUser(decoded);
      setData((prev) => ({ ...prev, preparedBy: decoded.id }));
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.categoryId === 1);
    }
  }, []);

  useEffect(() => {
    const subtotal = orderDetails.reduce(
      (acc, detail) =>
        acc +
        parseFloat(detail.unitPrice || 0) * parseFloat(detail.quantity || 0),
      0
    );
    const totalDiscount = orderDetails.reduce(
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
  }, [orderDetails]);

  useEffect(() => {
    if (id) {
      const token = localStorage.getItem("token");
      axios
        .get(`${ServerIP}/auth/order/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((result) => {
          if (result.data.Status) {
            const orderData = result.data.Result;
            // Ensure all fields have default values
            setData((prev) => ({
              ...prev,
              ...orderData,
              orderDate:
                orderData.orderDate || new Date().toISOString().split("T")[0],
              dueDate: orderData.dueDate || "",
              dueTime: orderData.dueTime || "",
              orderedBy: orderData.orderedBy || "",
              orderReference: orderData.orderReference || "",
              cellNumber: orderData.cellNumber || "",
              specialInst: orderData.specialInst || "",
              deliveryInst: orderData.deliveryInst || "",
              terms: orderData.terms || "",
              amountPaid: orderData.amountPaid || "0",
              totalHrs: orderData.totalHrs || 0, // Set totalHrs from order record
            }));
            setIsHeaderSaved(true);
            setOrderId(id);
          }
        })
        .catch((err) => handleApiError(err, navigate));
    }
  }, [id, navigate]);

  const fetchDropdownData = async () => {
    if (dropdownsLoaded) return; // Skip if already loaded

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
    if (!data.clientId) newError.clientId = true;
    if (!data.projectName) newError.projectName = true;
    if (!data.graphicsBy) newError.graphicsBy = true;

    if (Object.keys(newError).length > 0) {
      setError(newError);
      return;
    }

    const token = localStorage.getItem("token");

    // Update data object to include totalAmount from orderTotals
    const updatedData = {
      ...data,
      totalAmount: orderTotals.subtotal, // Set totalAmount from subtotal
      amountDisc: orderTotals.discAmount,
      percentDisc: orderTotals.percentDisc,
      grandTotal: orderTotals.grandTotal,
    };

    if (!isHeaderSaved) {
      // Create new order
      axios
        .post(`${ServerIP}/auth/add_order`, updatedData, {
          // Use updatedData instead of data
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((result) => {
          if (result.data.Status) {
            const orderId = result.data.Result;
            setOrderId(orderId);
            setIsHeaderSaved(true);
            setData((prev) => ({
              ...prev,
              orderId: orderId,
            }));
          } else {
            setAlert({
              show: true,
              title: "Error",
              message: result.data.Error || "Failed to save order",
              type: "alert",
            });
          }
        })
        .catch((err) => {
          console.error("Error saving order:", err);
          setAlert({
            show: true,
            title: "Error",
            message: "Failed to save order",
            type: "alert",
          });
        });
    } else {
      // Update existing order
      axios
        .put(`${ServerIP}/auth/update_order/${orderId || id}`, updatedData, {
          // Use updatedData instead of data
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((result) => {
          if (result.data.Status) {
            if (isEditMode && !isPrintAction) {
              navigate("/dashboard/orders");
            }
          } else {
            setAlert({
              show: true,
              title: "Error",
              message: result.data.Error || "Failed to update order",
              type: "alert",
            });
          }
        })
        .catch((err) => {
          console.error("Error updating order:", err);
          setAlert({
            show: true,
            title: "Error",
            message: "Failed to update order",
            type: "alert",
          });
        });
    }
  };

  // Helper function for error handling
  // const handleError = (err) => {
  //   if (
  //     err.response?.status === 401 ||
  //     err.response?.data?.Error?.includes("jwt expired") ||
  //     err.response?.data?.Error?.includes("invalid token")
  //   ) {
  //     setAlert({
  //       show: true,
  //       title: "Error",
  //       message: "Your session has expired. Please log out and log in again.",
  //       type: "alert",
  //     });
  //     localStorage.removeItem("token");
  //     navigate("/");
  //   } else {
  //     setAlert({
  //       show: true,
  //       title: "Error",
  //       message: err.response?.data?.Error || "An error occurred",
  //       type: "alert",
  //     });
  //   }
  // };

  const handleDetailAdded = () => {
    fetchOrderDetails();
    const token = localStorage.getItem("token");
    axios
      .get(`${ServerIP}/auth/order_details/${orderId || id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((result) => {
        if (result.data.Status) {
          setOrderDetails(result.data.Result);
          const totals = calculateTotals(result.data.Result);
          setTotals(totals);
          setData((prev) => ({
            ...prev,
            totalHrs: totals.totalHrs,
          }));

          // Update order with new totalHrs
          const orderUpdateData = {
            lastEdited: new Date().toISOString().slice(0, 19).replace("T", " "),
            editedBy: localStorage.getItem("userName"),
            totalHrs: totals.totalHrs,
          };

          axios.put(
            `${ServerIP}/auth/orders/${orderId || id}/update_edited_info`,
            orderUpdateData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      })
      .catch((err) => console.log(err));
  };

  const handleDeleteDetail = (uniqueId) => {
    setAlert({
      show: true,
      title: "Confirm Deletion",
      message: "Are you sure you want to delete this item?",
      type: "confirm",
      onConfirm: () => {
        const token = localStorage.getItem("token");
        const decoded = jwtDecode(token);
        const currentDateTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        const [orderId, displayOrder] = uniqueId.split("_");

        // Update orderDetails by removing the deleted detail first to calculate new totals
        const updatedDetails = orderDetails.filter(
          (detail) =>
            !(
              detail.orderId === parseInt(orderId) &&
              detail.displayOrder === parseInt(displayOrder)
            )
        );

        // Calculate new totals
        const totals = calculateTotals(updatedDetails);

        // Update order's last edited info and totalHrs
        const orderUpdateData = {
          lastEdited: currentDateTime,
          editedBy: localStorage.getItem("userName"),
          totalHrs: totals.totalHrs,
        };

        // Update order first, then delete detail
        Promise.all([
          // Update order with only the three fields using new endpoint
          axios.put(
            `${ServerIP}/auth/orders/${orderId}/update_edited_info`,
            orderUpdateData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          // Delete the detail
          axios.delete(
            `${ServerIP}/auth/order_detail/${orderId}/${displayOrder}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ])
          .then(([orderResult, detailResult]) => {
            if (detailResult.data.Status) {
              // Update local states
              setOrderDetails(updatedDetails);
              setTotals(totals);
              setData((prev) => ({
                ...prev,
                totalHrs: totals.totalHrs,
              }));
            } else {
              setAlert({
                show: true,
                title: "Error",
                message: detailResult.data.Error,
                type: "alert",
              });
            }
          })
          .catch((err) => handleApiError(err, navigate));
      },
    });
  };

  const handleEditClick = (uniqueId, detail) => {
    console.log("Edit clicked for unique ID:", uniqueId);
    console.log("Detail data:", detail);
    console.log("Material value:", detail.material);

    if (!dropdownsLoaded) {
      fetchDropdownData();
    }
    setEditingRowId(uniqueId);

    // Initialize edited values with current detail, preserving all fields
    const editedDetail = {
      ...detail, // Spread all existing properties
      quantity: detail.quantity || "",
      width: detail.width || "",
      height: detail.height || "",
      unit: detail.unit || "",
      material: detail.material || "", // Preserve material
      perSqFt: detail.perSqFt || "",
      unitPrice: detail.unitPrice || "",
      discount: detail.discount || "",
      amount: detail.amount || "",
      remarks: detail.remarks || "",
      itemDescription: detail.itemDescription || "",
    };

    console.log("Edited detail being set:", editedDetail); // Debug log

    setEditedValues({
      [uniqueId]: editedDetail,
    });
  };

  const handleFinish = () => {
    navigate("/dashboard/orders");
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
    color: "black", // This will override the browser's default color for date/time inputs
  };

  // Handler for input changes with auto-calculation
  const handleDetailInputChange = (uniqueId, field, value) => {
    setEditedValues((prev) => {
      const updatedValues = {
        ...prev,
        [uniqueId]: {
          ...(prev[uniqueId] || {}),
          [field]: value,
        },
      };

      const currentDetail = updatedValues[uniqueId];

      // Recalculate area when dimensions or unit changes
      if (["width", "height", "unit", "quantity", "material"].includes(field)) {
        const { squareFeet, materialUsage } = calculateArea(
          currentDetail.width || 0,
          currentDetail.height || 0,
          currentDetail.unit,
          currentDetail.quantity || 0,
          {
            top: currentDetail.top || 0,
            bottom: currentDetail.bottom || 0,
            left: currentDetail.allowanceLeft || 0,
            right: currentDetail.allowanceRight || 0,
          }
        );

        // Calculate print hours using the utility function
        const printHrs = calculatePrintHrs(
          squareFeet,
          currentDetail.quantity || 0,
          currentDetail.material,
          materials
        );
        console.log("Calculated Print hours:", printHrs);

        // Calculate price based on new area
        const perSqFt = parseFloat(currentDetail.perSqFt) || 0;
        const price = calculatePrice(squareFeet, perSqFt);
        const amount = calculateAmount(
          price,
          currentDetail.discount || 0,
          currentDetail.quantity || 0
        );

        updatedValues[uniqueId] = {
          ...currentDetail,
          [field]: value,
          squareFeet: squareFeet,
          materialUsage: materialUsage,
          unitPrice: price,
          amount: amount,
          printHrs: printHrs,
        };
      }
      // Recalculate perSqFt when unitPrice changes
      else if (field === "unitPrice") {
        const perSqFt = calculatePerSqFt(value, currentDetail.squareFeet || 0);
        const amount = calculateAmount(
          value,
          currentDetail.discount || 0,
          currentDetail.quantity || 0
        );

        updatedValues[uniqueId] = {
          ...currentDetail,
          [field]: value,
          perSqFt: perSqFt,
          amount: amount,
        };
      }
      // Recalculate price and amount when perSqFt or discount changes
      else if (["perSqFt", "discount"].includes(field)) {
        const price = calculatePrice(
          currentDetail.squareFeet || 0,
          currentDetail.perSqFt || 0
        );
        const amount = calculateAmount(
          price,
          currentDetail.discount || 0,
          currentDetail.quantity || 0
        );

        updatedValues[uniqueId] = {
          ...currentDetail,
          [field]: value,
          unitPrice: price,
          amount: amount,
        };
      } else {
        // For other fields, just update the value
        updatedValues[uniqueId] = {
          ...currentDetail,
          [field]: value,
        };
      }

      return updatedValues;
    });

    // Clear error for this field if it exists
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

  const handleSaveDetail = (uniqueId) => {
    const updatedDetail = editedValues[uniqueId];
    const errors = validateDetail(updatedDetail);

    if (Object.keys(errors).length > 0) {
      setEditErrors({ ...editErrors, [uniqueId]: errors });
      return;
    }

    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const currentDateTime = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    console.log("Values being saved:", updatedDetail); // Debug log

    const sanitizedDetail = {
      ...updatedDetail,
      quantity: updatedDetail.quantity || 0,
      width: updatedDetail.width || 0,
      height: updatedDetail.height || 0,
      perSqFt: updatedDetail.perSqFt || 0,
      unitPrice: updatedDetail.unitPrice || 0,
      discount: updatedDetail.discount || 0,
      amount: updatedDetail.amount || 0,
      squareFeet: updatedDetail.squareFeet || 0,
      materialUsage: updatedDetail.materialUsage || 0,
      unit: updatedDetail.unit || "",
      material: updatedDetail.material || "",
      itemDescription: updatedDetail.itemDescription || "",
      remarks: updatedDetail.remarks || "",
      printHrs: updatedDetail.printHrs || 0,
    };

    console.log("Sanitized detail being sent:", sanitizedDetail);

    const [orderId, displayOrder] = uniqueId.split("_");

    // Update the detail in orderDetails first to calculate new totals
    const updatedDetails = orderDetails.map((detail) =>
      detail.orderId === parseInt(orderId) &&
      detail.displayOrder === parseInt(displayOrder)
        ? { ...detail, ...sanitizedDetail }
        : detail
    );

    // Calculate new totals
    const totals = calculateTotals(updatedDetails);

    // Update order's last edited info and totalHrs only
    const orderUpdateData = {
      lastEdited: currentDateTime,
      editedBy: localStorage.getItem("userName"),
      totalHrs: totals.totalHrs,
    };

    // Save both updates
    Promise.all([
      // Update order with only the three fields using new endpoint
      axios.put(
        `${ServerIP}/auth/orders/${orderId}/update_edited_info`,
        orderUpdateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
      // Update order detail
      axios.put(
        `${ServerIP}/auth/order_details/${orderId}/${displayOrder}`,
        sanitizedDetail,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ])
      .then(([orderResult, detailResult]) => {
        if (detailResult.data.Status) {
          setEditingRowId(null);
          setEditedValues({});
          setEditErrors({});

          // Update local states
          setOrderDetails(updatedDetails);
          setTotals(totals);
          setData((prev) => ({
            ...prev,
            totalHrs: totals.totalHrs,
          }));
        } else {
          setAlert({
            show: true,
            title: "Validation Error",
            message: detailResult.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => handleApiError(err, navigate));
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      if (dropdownsLoaded) return; // Skip if already loaded

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

  // Add console log to see the order details data
  useEffect(() => {
    const fetchOrderDetails = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(
          `${ServerIP}/auth/order_details/${orderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Fetched order details:", response.data);
        if (response.data.Status) {
          setOrderDetails(response.data.Result);
          // Initialize orderTotals with saved values from the order
          setOrderTotals((prev) => ({
            ...prev,
            discAmount: data.amountDisc || 0,
            percentDisc: data.percentDisc || 0,
          }));
        }
      } catch (err) {
        handleApiError(err, navigate);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // Add this useEffect to handle automatic recalculations
  useEffect(() => {
    const subtotal = orderDetails.reduce(
      (sum, detail) => sum + parseFloat(detail.amount || 0),
      0
    );
    const discAmount = parseFloat(orderTotals.discAmount) || 0;

    // Recalculate percent discount based on current discount amount and new subtotal
    const percentDisc =
      subtotal > 0 ? ((discAmount / subtotal) * 100).toFixed(2) : 0;

    // Calculate new grand total
    const grandTotal = subtotal - discAmount;

    // Update all totals
    setOrderTotals((prev) => ({
      ...prev,
      subtotal,
      percentDisc: parseFloat(percentDisc),
      grandTotal,
    }));

    // Update main data state for database
    setData((prev) => ({
      ...prev,
      amountDisc: discAmount,
      percentDisc: parseFloat(percentDisc),
      grandTotal: grandTotal,
    }));
  }, [orderDetails]); // Dependency on orderDetails

  // Add this function to handle the update
  const handleDisplayOrderUpdate = async (detail, newOrder) => {
    console.log("Detail object:", detail);

    // Validate that we have all required data
    if (!detail || !detail.Id) {
      console.error("Missing detail Id:", detail);
      setAlert({
        show: true,
        title: "Error",
        message: "Could not identify the order detail",
        type: "alert",
      });
      return;
    }

    // Validate that newOrder is a positive integer
    const orderNum = parseInt(newOrder);
    if (!Number.isInteger(orderNum) || orderNum <= 0) {
      setAlert({
        show: true,
        title: "Validation Error",
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
        `${ServerIP}/auth/order_detail_display_order/${orderId}/${detail.Id}`,
        { displayOrder: orderNum },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the order details
      fetchOrderDetails();
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

  const handlePrintOrder = async () => {
    if (orderDetails.length === 0) {
      setAlert({
        show: true,
        title: "Error",
        message:
          "Cannot print order. No order details found. Please add order details first.",
        type: "alert",
      });
      return; // Add return to prevent navigation if no details
    }

    try {
      // First update the status to "Printed"
      const response = await axios.put(
        `${ServerIP}/auth/update_order_status`,
        {
          orderId: id,
          newStatus: "Printed",
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.Status) {
        // Update local state
        setData((prev) => ({
          ...prev,
          status: "Printed",
        }));

        // Navigate to print view
        navigate(`/dashboard/print_order/${id}`);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to update order status: " + response.data.Error,
          type: "error",
        });
      }
    } catch (error) {
      handleApiError(error, setAlert);
    }
  };

  // Add this new function to handle noPrint toggle
  const handleNoPrintToggle = async (orderId, displayOrder, currentNoPrint) => {
    try {
      const token = localStorage.getItem("token");
      const newNoPrintValue = currentNoPrint === 1 ? 0 : 1;

      // Optimistically update the UI first
      setOrderDetails((prevDetails) =>
        prevDetails.map((detail) =>
          detail.orderId === parseInt(orderId) &&
          detail.displayOrder === parseInt(displayOrder)
            ? { ...detail, noPrint: newNoPrintValue }
            : detail
        )
      );

      // Then make the API call
      const response = await axios.put(
        `${ServerIP}/auth/order_detail_noprint/${orderId}/${displayOrder}`,
        { noPrint: newNoPrintValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.Status) {
        // If the API call fails, revert the optimistic update
        setOrderDetails((prevDetails) =>
          prevDetails.map((detail) =>
            detail.orderId === parseInt(orderId) &&
            detail.displayOrder === parseInt(displayOrder)
              ? { ...detail, noPrint: currentNoPrint }
              : detail
          )
        );
        throw new Error("Failed to update print status");
      }
    } catch (error) {
      console.error("Error toggling noPrint status:", error);
      handleApiError(error);
    }
  };
  const handleReOrder = () => {
    const token = localStorage.getItem("token");

    // Create a new order with copied data
    const newOrderData = {
      clientId: data.clientId,
      projectName: data.projectName.includes(" (Reorder)")
        ? data.projectName // Keep it unchanged if already added
        : data.projectName + " (Reorder)",
      preparedBy: data.preparedBy,
      orderDate: new Date().toISOString().split("T")[0], // Set to current date
      orderedBy: data.orderedBy,
      orderReference: data.orderReference,
      cellNumber: data.cellNumber,
      specialInst: data.specialInst,
      deliveryInst: data.deliveryInst,
      graphicsBy: data.graphicsBy,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      sample: data.sample,
      reprint: data.reprint,
      totalAmount: data.totalAmount,
      amountDisc: data.amountDisc,
      percentDisc: data.percentDisc,
      grandTotal: data.grandTotal,
      terms: data.terms,
      status: "Open",
      totalHrs: data.totalHrs, // Add totalHrs
      editedBy: localStorage.getItem("userName"), // Add current employee name
      //      lastEdited: currentDateTime, // Add current datetime
    };

    console.log("New order data:", newOrderData);
    // Create new order
    axios
      .post(`${ServerIP}/auth/add_order`, newOrderData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((result) => {
        if (result.data.Status) {
          const newOrderId = result.data.Result;

          // Now copy all order details
          axios
            .get(`${ServerIP}/auth/order_details/${orderId || id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((detailsResult) => {
              if (detailsResult.data.Status) {
                const details = detailsResult.data.Result;
                const copyPromises = details.map((detail) => {
                  const newDetail = {
                    ...detail,
                    orderId: newOrderId,
                    quantity: detail.quantity,
                    width: detail.width,
                    height: detail.height,
                    unit: detail.unit,
                    material: detail.material,
                    itemDescription: detail.itemDescription,
                    unitPrice: detail.unitPrice,
                    perSqFt: detail.perSqFt,
                    discount: detail.discount,
                    amount: detail.amount,
                    squareFeet: detail.squareFeet,
                    materialUsage: detail.materialUsage,
                    printHrs: detail.printHrs,
                    displayOrder: detail.displayOrder,
                    remarks: detail.remarks,
                    top: detail.top,
                    bottom: detail.bottom,
                    allowanceLeft: detail.allowanceLeft,
                    allowanceRight: detail.allowanceRight,
                    noPrint: detail.noPrint,
                  };

                  return axios.post(
                    `${ServerIP}/auth/add_order_detail`,
                    newDetail,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                });

                // Wait for all details to be copied
                Promise.all(copyPromises)
                  .then(() => {
                    // Navigate to the new order
                    navigate(`/dashboard/orders/edit/${newOrderId}`);
                  })
                  .catch((err) => {
                    console.error("Error copying order details:", err);
                    setAlert({
                      show: true,
                      title: "Error",
                      message: "Error copying order details",
                      type: "alert",
                    });
                  });
              }
            })
            .catch((err) => {
              console.error("Error fetching order details:", err);
              setAlert({
                show: true,
                title: "Error",
                message: "Error fetching order details",
                type: "alert",
              });
            });
        }
      })
      .catch((err) => {
        console.error("Error creating new order:", err);
        setAlert({
          show: true,
          title: "Error",
          message: "Error creating new order",
          type: "alert",
        });
      });
  };

  // Add the handler function
  const handleReviseOrder = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/order/ReviseNumber/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        // Update local state
        setData((prev) => ({
          ...prev,
          status: "Open",
          revision: response.data.revision,
        }));

        setAlert({
          show: true,
          title: "Success",
          message: `Order revised. New revision: ${response.data.revision}`,
          type: "alert",
        });
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

  const handleStatusRightClick = (e) => {
    e.preventDefault(); // Prevent default context menu
    if (canEdit() && adminOverride) {
      // Get the clicked element's position
      const rect = e.currentTarget.getBoundingClientRect();
      // Position the dropdown below and to the right of the status badge
      setDropdownPosition({
        x: rect.left,
        y: rect.bottom + window.scrollY,
      });
      setShowStatusDropdown(true);
    }
  };

  const handleStatusChange = async (newStatus) => {
    // Exit if status hasn't changed
    if (newStatus === data.status) {
      setShowStatusDropdown(false);
      return;
    }

    try {
      const response = await axios.put(
        `${ServerIP}/auth/admin-status-update`,
        {
          orderId: id,
          newStatus,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.Status) {
        setData((prev) => ({
          ...prev,
          status: newStatus,
        }));
        setAlert({
          show: true,
          title: "Success",
          message: "Status updated successfully",
          type: "alert",
        });
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
    } finally {
      setShowStatusDropdown(false);
    }
  };

  return (
    <div className="orders-page-background">
      <div className="px-4 mt-3">
        <div className="p-3 rounded border">
          <div className="mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <h3 className="m-0">
                {id ? `Edit Order #${data.orderId}` : "Add New Order"}
                {data.revision > 0 && (
                  <span className="text-muted ms-2">Rev.{data.revision}</span>
                )}
              </h3>
              {isAdmin && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="adminOverride"
                    checked={adminOverride}
                    onChange={(e) => setAdminOverride(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="adminOverride">
                    Admin Edit Override
                  </label>
                </div>
              )}
            </div>
            <div className="d-flex gap-2">
              {isHeaderSaved && (
                <>
                  {data.status === "Printed" && (
                    <Button
                      variant="edit"
                      onClick={handleReviseOrder}
                      className="ms-2"
                    >
                      Revise
                    </Button>
                  )}
                  <Button variant="save" onClick={handleReOrder}>
                    Reorder
                  </Button>{" "}
                  <Button variant="print" onClick={handlePrintOrder}>
                    Print JO
                  </Button>
                </>
              )}
              <Button variant="save" onClick={handleSubmit}>
                {isHeaderSaved ? "Finish Edit" : "Save Order"}
              </Button>
              <Button
                variant="cancel"
                onClick={() => navigate("/dashboard/orders")}
              >
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
              {/* Start of form section */}
              <div className="form-section">
                <div className="row">
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <label htmlFor="orderDate" className="form-label">
                        Order Date
                      </label>
                      <input
                        id="order-date"
                        type="date"
                        className="form-control rounded-0"
                        value={data.orderDate || ""}
                        onChange={(e) =>
                          setData({ ...data, orderDate: e.target.value })
                        }
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <label htmlFor="prepared-by" className="form-label">
                        Prepared By
                      </label>
                      <Dropdown
                        id="prepared-by"
                        variant="form"
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
                        className="form-control rounded-0"
                        id="terms"
                        style={inputStyle}
                        value={data.terms || ""}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="clientId"
                        className="form-label"
                        style={labelStyle}
                      >
                        Client <span className="text-danger">*</span>
                      </label>
                      <Dropdown2
                        variant="form"
                        id="clientId"
                        value={data.clientId || ""}
                        onChange={(e) => handleClientChange(e.target.value)}
                        options={clients}
                        disabled={!isEditMode || !canEdit()}
                        error={error.clientId}
                        required
                        placeholder=""
                        column1Key="clientName"
                        column2Key="customerName"
                        valueKey="id"
                      />
                      {error.clientId && (
                        <div className="invalid-feedback">
                          Client is required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-8">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="customerName"
                        className="form-label"
                        style={labelStyle}
                      >
                        Customer Name
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="customerName"
                        style={inputStyle}
                        value={data.customerName || ""}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="col-4">
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
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="orderReference"
                        className="form-label"
                        style={labelStyle}
                      >
                        Order Reference
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="orderReference"
                        style={inputStyle}
                        value={data.orderReference || ""}
                        onChange={(e) =>
                          setData({ ...data, orderReference: e.target.value })
                        }
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-3">
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
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-3">
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
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="dueTime"
                        className="form-label"
                        style={labelStyle}
                      >
                        Due Time
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="dueTime"
                        style={inputStyle}
                        value={data.dueTime || ""}
                        onChange={(e) =>
                          setData({ ...data, dueTime: e.target.value })
                        }
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="graphicsBy"
                        className="form-label"
                        style={labelStyle}
                      >
                        Graphics By <span className="text-danger">*</span>
                      </label>
                      <Dropdown
                        variant="form"
                        id="graphicsBy"
                        value={data.graphicsBy}
                        onChange={(e) =>
                          setData({ ...data, graphicsBy: e.target.value })
                        }
                        options={artists}
                        disabled={!isEditMode || !canEdit()}
                        error={error.graphicsBy}
                        required
                        placeholder=""
                      />
                      {error.graphicsBy && (
                        <div className="invalid-feedback">
                          Graphics By is required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="specialInst"
                        className="form-label"
                        style={labelStyle}
                      >
                        Special Instructions
                      </label>
                      <textarea
                        className="form-control rounded-0"
                        id="specialInst"
                        style={inputStyle}
                        value={data.specialInst || ""}
                        onChange={(e) =>
                          setData({ ...data, specialInst: e.target.value })
                        }
                        rows="3"
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex flex-column">
                      <label
                        htmlFor="deliveryInst"
                        className="form-label"
                        style={labelStyle}
                      >
                        Delivery Instructions
                      </label>
                      <textarea
                        className="form-control rounded-0"
                        id="deliveryInst"
                        style={inputStyle}
                        value={data.deliveryInst || ""}
                        onChange={(e) =>
                          setData({ ...data, deliveryInst: e.target.value })
                        }
                        rows="3"
                        disabled={!isEditMode || !canEdit()}
                      />
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex flex-column">
                      <label htmlFor="sample" className="form-label">
                        &nbsp;
                      </label>
                      <div className="d-flex gap-3">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            id="sample"
                            checked={data.sample}
                            onChange={(e) =>
                              setData({ ...data, sample: e.target.checked })
                            }
                            disabled={!isEditMode || !canEdit()}
                          />
                          <label className="form-check-label" htmlFor="sample">
                            Sample
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            id="reprint"
                            checked={data.reprint}
                            onChange={(e) =>
                              setData({ ...data, reprint: e.target.checked })
                            }
                            disabled={!isEditMode || !canEdit()}
                          />
                          <label className="form-check-label" htmlFor="reprint">
                            Reprint
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* End of form section */}
            </form>

            <div className="right-panel">
              <div className="right-panel-content">
                <div className="info-group">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="info-label mb-0">Status:</div>
                    <span
                      className={`status-badge ${data.status || "default"}`}
                      style={{
                        cursor:
                          canEdit() && adminOverride
                            ? "context-menu"
                            : "default",
                      }}
                      onContextMenu={handleStatusRightClick}
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

                <div className="info-group">
                  <div className="info-label">Production Date</div>
                  <div className="info-value">
                    {data.productionDate
                      ? new Date(data.productionDate)
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
                  <div className="info-label">Ready Date</div>
                  <div className="info-value">
                    {data.readyDate
                      ? new Date(data.readyDate)
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
                  <div className="info-label">Delivery Date</div>
                  <div className="info-value">
                    {data.deliveryDate
                      ? new Date(data.deliveryDate)
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
                  <div className="info-label">Bill Date</div>
                  <div className="info-value">
                    {data.billDate
                      ? new Date(data.billDate)
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
              </div>
            </div>
          </div>

          {isHeaderSaved && (
            <div className="mt-4">
              <h5>Order Details List</h5>
              <table className="order-table table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="text-center">Qty</th>
                    <th className="text-center">Width</th>
                    <th className="text-center">Height</th>
                    <th>Unit</th>
                    <th>Material</th>
                    <th className="text-end">Per Sq Ft</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Disc%</th>
                    <th className="text-end">Amount</th>
                    <th>Description</th>
                    <th>JO Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetails.map((detail, index) => {
                    const uniqueId = `${detail.orderId}_${detail.displayOrder}`;
                    return (
                      <tr
                        key={uniqueId}
                        className={detail.noPrint === 1 ? "no-print" : ""}
                        data-toggleable="true"
                        onDoubleClick={() =>
                          handleNoPrintToggle(
                            detail.orderId,
                            detail.displayOrder,
                            detail.noPrint
                          )
                        }
                      >
                        {editingRowId === uniqueId ? (
                          <>
                            <td style={{ width: "40px" }}>
                              {detail.displayOrder}
                            </td>
                            <td style={{ width: "60px" }}>
                              <input
                                type="text"
                                className="form-control form-control-sm quantity-input"
                                value={
                                  editedValues[uniqueId]?.quantity
                                    ? Number(
                                        editedValues[uniqueId].quantity
                                      ).toLocaleString()
                                    : detail.quantity.toLocaleString()
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /,/g,
                                    ""
                                  );
                                  if (!isNaN(value)) {
                                    handleDetailInputChange(
                                      uniqueId,
                                      "quantity",
                                      value
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm dimension-input"
                                value={
                                  editedValues[uniqueId]?.width || detail.width
                                }
                                onChange={(e) =>
                                  handleDetailInputChange(
                                    uniqueId,
                                    "width",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm dimension-input"
                                value={
                                  editedValues[uniqueId]?.height ||
                                  detail.height
                                }
                                onChange={(e) =>
                                  handleDetailInputChange(
                                    uniqueId,
                                    "height",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <Dropdown
                                variant="table"
                                value={
                                  editedValues[uniqueId]?.unit ||
                                  detail.unit ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDetailInputChange(
                                    uniqueId,
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
                                value={
                                  editedValues[uniqueId]?.material ||
                                  detail.material ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDetailInputChange(
                                    uniqueId,
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
                              <input
                                type="text"
                                className="form-control form-control-sm persqft-input"
                                value={
                                  editedValues[uniqueId]?.perSqFt
                                    ? editingRowId === uniqueId
                                      ? editedValues[uniqueId].perSqFt
                                      : Number(
                                          editedValues[uniqueId].perSqFt
                                        ).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                    : Number(detail.perSqFt).toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^\d.-]/g,
                                    ""
                                  );
                                  if (!isNaN(value)) {
                                    handleDetailInputChange(
                                      uniqueId,
                                      "perSqFt",
                                      value
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm price-input"
                                value={
                                  editedValues[uniqueId]?.unitPrice
                                    ? editingRowId === uniqueId
                                      ? editedValues[uniqueId].unitPrice
                                      : Number(
                                          editedValues[uniqueId].unitPrice
                                        ).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                    : Number(detail.unitPrice).toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^\d.-]/g,
                                    ""
                                  );
                                  if (!isNaN(value)) {
                                    handleDetailInputChange(
                                      uniqueId,
                                      "unitPrice",
                                      value
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm discount-input"
                                value={
                                  editedValues[uniqueId]?.discount
                                    ? editingRowId === uniqueId
                                      ? editedValues[uniqueId].discount
                                      : Number(
                                          editedValues[uniqueId].discount
                                        ).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                    : Number(detail.discount).toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^\d.-]/g,
                                    ""
                                  );
                                  if (!isNaN(value)) {
                                    handleDetailInputChange(
                                      uniqueId,
                                      "discount",
                                      value
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td className="numeric-cell">
                              {formatNumber(
                                editedValues[uniqueId]?.amount || detail.amount
                              )}
                            </td>
                            <td>
                              <textarea
                                className="form-control form-control-sm description-input"
                                value={
                                  editedValues[uniqueId]?.itemDescription ||
                                  detail.itemDescription
                                }
                                onChange={(e) => {
                                  handleDetailInputChange(
                                    uniqueId,
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
                            <td>
                              <textarea
                                className="form-control form-control-sm remarks-input"
                                value={
                                  editedValues[uniqueId]?.remarks ||
                                  detail.remarks
                                }
                                onChange={(e) => {
                                  handleDetailInputChange(
                                    uniqueId,
                                    "remarks",
                                    e.target.value
                                  );
                                  e.target.style.height = "31px";
                                  e.target.style.height =
                                    e.target.scrollHeight + "px";
                                }}
                                rows="1"
                              />
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="view"
                                  iconOnly
                                  size="sm"
                                  icon={<BiRectangle size={14} />}
                                  onClick={() => {
                                    setShowAllowanceTooltip(false);
                                    setCurrentDetailId(uniqueId);
                                    setAllowanceValues({
                                      top: detail.top || 0,
                                      bottom: detail.bottom || 0,
                                      left: detail.allowanceLeft || 0,
                                      right: detail.allowanceRight || 0,
                                    });
                                    setShowAllowanceModal(true);
                                  }}
                                />
                                <Button
                                  variant="save"
                                  iconOnly
                                  size="sm"
                                  onClick={() => handleSaveDetail(uniqueId)}
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
                            <td>
                              {editingDisplayOrder ===
                              `${detail.orderId}_${detail.displayOrder}` ? (
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
                                      `${detail.orderId}_${detail.displayOrder}`
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
                            <td className="centered-cell">{detail.perSqFt}</td>
                            <td className="numeric-cell">
                              {formatNumber(detail.unitPrice)}
                            </td>
                            <td className="numeric-cell">
                              {formatNumber(detail.discount)}
                            </td>
                            <td className="numeric-cell">
                              {formatNumber(detail.amount)}
                            </td>
                            <td>{detail.itemDescription}</td>
                            <td>{detail.remarks}</td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="view"
                                  iconOnly
                                  size="sm"
                                  icon={<BiRectangle size={14} />}
                                  onClick={() => {
                                    if (!canEdit()) return;
                                    setShowAllowanceTooltip(false);
                                    setCurrentDetailId(uniqueId);
                                    setAllowanceValues({
                                      top: detail.top || 0,
                                      bottom: detail.bottom || 0,
                                      left: detail.allowanceLeft || 0,
                                      right: detail.allowanceRight || 0,
                                    });
                                    setShowAllowanceModal(true);
                                  }}
                                  onMouseOver={(e) => {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    setTooltipPosition({
                                      x: rect.left + 25,
                                      y: rect.top + window.scrollY - 82,
                                    });
                                    setTooltipDetail(detail);
                                    setShowAllowanceTooltip(true);
                                  }}
                                  onMouseLeave={() => {
                                    setShowAllowanceTooltip(false);
                                  }}
                                />
                                <Button
                                  variant="edit"
                                  disabled={!canEdit()}
                                  iconOnly
                                  size="sm"
                                  onClick={() =>
                                    handleEditClick(uniqueId, detail)
                                  }
                                />
                                <Button
                                  variant="delete"
                                  disabled={!canEdit()}
                                  iconOnly
                                  size="sm"
                                  onClick={() => handleDeleteDetail(uniqueId)}
                                />
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid lightgrey" }}>
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
                      {formatNumber(orderTotals.subtotal)}
                    </td>
                    <td colSpan="3">
                      <div className="ms-3 d-flex align-items-center">
                        <div style={{ width: "100px", textAlign: "right" }}>
                          <small style={{ fontSize: "1rem" }}>Date Paid:</small>
                        </div>
                        <div>{data.datePaid}</div>
                      </div>
                    </td>
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
                    <td className="text-end pe-2 nowrap">Disc. Amount:</td>
                    <td className="numeric-cell">
                      <input
                        type="number"
                        className="form-control form-control-sm text-end"
                        value={orderTotals.discAmount}
                        onChange={(e) =>
                          handleDiscountChange("amount", e.target.value)
                        }
                        style={{ width: "100px", display: "inline-block" }}
                        disabled={!canEdit()}
                      />
                    </td>
                    <td colSpan="3">
                      <div className="ms-3 d-flex align-items-center">
                        <div style={{ width: "100px", textAlign: "right" }}>
                          <small style={{ fontSize: "1rem" }}>OR Number:</small>
                        </div>
                        <div>{data.orNum}</div>
                      </div>
                    </td>
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
                    <td className="text-end pe-2">Percent Disc.:</td>
                    <td className="numeric-cell">
                      <input
                        type="number"
                        className="form-control form-control-sm text-end"
                        value={orderTotals.percentDisc}
                        onChange={(e) =>
                          handleDiscountChange("percent", e.target.value)
                        }
                        style={{ width: "100px", display: "inline-block" }}
                        disabled={!canEdit()}
                      />
                    </td>
                    <td colSpan="3">
                      <div className="ms-3 d-flex align-items-center">
                        <div style={{ width: "100px", textAlign: "right" }}>
                          <small style={{ fontSize: "1rem" }}>
                            Amount Paid:
                          </small>
                        </div>
                        <div style={{ width: "80px", textAlign: "right" }}>
                          {formatNumber(data.amountPaid || 0)}
                        </div>
                      </div>
                    </td>
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
                    <td className="text-end pe-2">Grand Total:</td>
                    <td className="numeric-cell">
                      {formatNumber(orderTotals.grandTotal)}
                    </td>
                    <td colSpan="3">
                      <div className="ms-3 d-flex align-items-center">
                        <div style={{ width: "100px", textAlign: "right" }}>
                          <small style={{ fontSize: "1rem" }}>Balance:</small>
                        </div>
                        <div style={{ width: "80px", textAlign: "right" }}>
                          {formatNumber(
                            orderTotals.grandTotal - (data.amountPaid || 0)
                          )}
                        </div>
                        <div className="ms-2">
                          <small style={{ fontSize: "1rem" }}>
                            (
                            {orderTotals.grandTotal > 0
                              ? (
                                  ((orderTotals.grandTotal -
                                    (data.amountPaid || 0)) /
                                    orderTotals.grandTotal) *
                                  100
                                ).toFixed(2) + "%"
                              : "0%"}
                            )
                          </small>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isHeaderSaved && canEdit() && (
          <div className="mt-4">
            <h5>Add Order Details</h5>
            <AddOrderDetails
              orderId={orderId}
              onDetailAdded={handleDetailAdded}
            />
          </div>
        )}

        {/* Allowance Modal */}
        <Modal
          variant="form"
          show={showAllowanceModal}
          onClose={() => setShowAllowanceModal(false)}
          title="Edit Allowance"
          footer={
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="cancel"
                onClick={() => setShowAllowanceModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="save"
                onClick={async () => {
                  const [orderId, displayOrder] = currentDetailId.split("_");
                  const currentDetail = orderDetails.find(
                    (d) =>
                      d.orderId === parseInt(orderId) &&
                      d.displayOrder === parseInt(displayOrder)
                  );

                  const { squareFeet, materialUsage, printHrs } =
                    calculateValues(currentDetail, allowanceValues);

                  const updatedDetail = {
                    ...currentDetail,
                    squareFeet,
                    materialUsage,
                    printHrs,
                    top: allowanceValues.top,
                    bottom: allowanceValues.bottom,
                    allowanceLeft: allowanceValues.left,
                    allowanceRight: allowanceValues.right,
                  };

                  // Save to database first
                  const token = localStorage.getItem("token");
                  try {
                    await axios.put(
                      `${ServerIP}/auth/order_details/${orderId}/${displayOrder}`,
                      updatedDetail,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    // Update local state only after successful save
                    const updatedDetails = orderDetails.map((detail) =>
                      detail.orderId === parseInt(orderId) &&
                      detail.displayOrder === parseInt(displayOrder)
                        ? updatedDetail
                        : detail
                    );
                    setOrderDetails(updatedDetails);

                    // Recalculate totals
                    const totals = calculateTotals(updatedDetails);
                    setTotals(totals);

                    // Update the main data state
                    setData((prev) => ({
                      ...prev,
                      orderDetails: updatedDetails,
                    }));

                    // Refresh the order details
                    fetchOrderDetails();

                    // Close the modal
                    setShowAllowanceModal(false);
                  } catch (err) {
                    console.error("Error saving allowance:", err);
                    setAlert({
                      show: true,
                      title: "Error",
                      message: "Failed to save allowance changes",
                      type: "alert",
                    });
                  }
                }}
              >
                Save
              </Button>
            </div>
          }
        >
          <div className="row g-3">
            <div className="d-flex flex-column align-items-center gap-3">
              <div style={{ width: "200px" }}>
                <label className="form-label text-center w-100">
                  Top Allowance
                </label>
                <Input
                  variant="form"
                  type="number"
                  value={allowanceValues.top}
                  onChange={(e) =>
                    setAllowanceValues((prev) => ({
                      ...prev,
                      top: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="d-flex gap-3">
                <div style={{ width: "200px" }}>
                  <label className="form-label text-center w-100">
                    Left Allowance
                  </label>
                  <Input
                    variant="form"
                    type="number"
                    value={allowanceValues.left}
                    onChange={(e) =>
                      setAllowanceValues((prev) => ({
                        ...prev,
                        left: e.target.value,
                      }))
                    }
                  />
                </div>
                <div style={{ width: "200px" }}>
                  <label className="form-label text-center w-100">
                    Right Allowance
                  </label>
                  <Input
                    variant="form"
                    type="number"
                    value={allowanceValues.right}
                    onChange={(e) =>
                      setAllowanceValues((prev) => ({
                        ...prev,
                        right: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div style={{ width: "200px" }}>
                <label className="form-label text-center w-100">
                  Bottom Allowance
                </label>
                <Input
                  variant="form"
                  type="number"
                  value={allowanceValues.bottom}
                  onChange={(e) =>
                    setAllowanceValues((prev) => ({
                      ...prev,
                      bottom: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </Modal>

        {/* Allowance Tooltip */}
        <Modal
          variant="tooltip"
          show={showAllowanceTooltip && tooltipDetail}
          position={tooltipPosition}
        >
          <div className="text-center mb-1">
            Print Hrs: {tooltipDetail?.printHrs || 0}
          </div>
          <div className="text-center">T: {tooltipDetail?.top || 0}</div>
          <div className="d-flex justify-content-between">
            <span>L: {tooltipDetail?.allowanceLeft || 0}</span>
            <span className="ms-3">
              R: {tooltipDetail?.allowanceRight || 0}
            </span>
          </div>
          <div className="text-center">B: {tooltipDetail?.bottom || 0}</div>
          <div className="text-center">
            Usage: {tooltipDetail?.materialUsage || 0}
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

        {showStatusDropdown && (
          <StatusDropdown
            show={showStatusDropdown}
            onClose={() => setShowStatusDropdown(false)}
            position={dropdownPosition}
            items={statusOptions.map((status) => ({
              label: status,
              onClick: () => handleStatusChange(status),
            }))}
          />
        )}
      </div>
    </div>
  );
}

export default AddOrder;
