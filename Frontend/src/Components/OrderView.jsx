import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { BiRectangle } from "react-icons/bi";
import "./AddOrder.css";
import "./Orders.css";
import "./OrderView.css";
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

  const canEdit = () => {
    return 0; // Always return 0, ignoring conditions
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

  // Helper function for error handling
  const handleError = (err) => {
    if (
      err.response?.status === 401 ||
      err.response?.data?.Error?.includes("jwt expired") ||
      err.response?.data?.Error?.includes("invalid token")
    ) {
      setAlert({
        show: true,
        title: "Error",
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

  return (
    <div className="prod-page-background">
      <div className="px-4 mt-3">
        <div className="p-3 rounded border">
          <div className="mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <h3 className="m-0">
                {id ? `Edit Order #${data.orderId}` : "Add New Order"}
              </h3>
            </div>
            <div className="d-flex gap-2">
              <Button variant="cancel" onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </div>

          <div className="d-flex">
            <form
              className="row g-1 flex-grow-1"
              style={{ marginTop: "-0.8rem" }}
            >
              <div className="col-4">
                <div className="d-flex flex-column">
                  <label
                    htmlFor="orderDate"
                    className="form-label"
                    style={labelStyle}
                  >
                    Order Date
                  </label>
                  <input
                    type="date"
                    className="form-control rounded-0"
                    id="orderDate"
                    style={dateTimeStyle}
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
                    disabled={!isEditMode || !canEdit()}
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
                    disabled={!isEditMode || !canEdit()}
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
                    disabled={!isEditMode || !canEdit()}
                  />
                </div>
              </div>
              <div className="col-4">
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
              <div className="col-4">
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
              <div className="col-4">
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
              <div className="col-12 mt-2 d-flex">
                <div className="form-check form-check-inline d-flex align-items-center">
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
                  <label
                    className="form-label mb-0"
                    style={labelStyle}
                    htmlFor="sample"
                  >
                    Sample
                  </label>
                </div>
                <div className="form-check form-check-inline d-flex align-items-center">
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
                  <label
                    className="form-label mb-0"
                    style={labelStyle}
                    htmlFor="reprint"
                  >
                    Reprint
                  </label>
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
                            <td></td>
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
      </div>
    </div>
  );
}

export default AddOrder;
