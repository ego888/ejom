import axios from "../utils/axiosConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Button from "./UI/Button";
import { BiRectangle } from "react-icons/bi";
import "./AddOrder.css";
import "./Orders.css";
import "./PaymentView.css";
import {
  formatNumber,
  formatPeso,
  handleApiError,
  formatDateTime,
  formatDate,
  parseDateValue,
} from "../utils/orderUtils";
import Modal from "./UI/Modal";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import PaymentHistory from "./PaymentHistory";
import PaymentAllocation from "./PaymentAllocation";
import { getClientBackgroundStyle } from "../utils/clientOverdueStyle";

function PaymentView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState({});
  const [orderDetails, setOrderDetails] = useState([]);
  const [showAllowanceTooltip, setShowAllowanceTooltip] = useState(false);
  const [tooltipDetail, setTooltipDetail] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedPayId, setSelectedPayId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [show, setShow] = useState(true);
  const [vatRate, setVatRate] = useState(0);

  // Add state for right panel tabs
  const [activeTab, setActiveTab] = useState("info");
  const [noteDraft, setNoteDraft] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const location = useLocation(); // Get the current route path

  let backgroundColor = "#fcd8f3";

  // Add ESC key handler
  useEffect(() => {
    console.log("useEffect handleEscKey");
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [navigate]);

  // Cache static data in localStorage
  const getCachedData = (key, fetchFn) => {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 1 hour
        if (Date.now() - timestamp < 3600000) {
          return data;
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
    return null;
  };

  // Use cached data where appropriate
  useEffect(() => {
    console.log("useEffect loadStaticData");
    const loadStaticData = async () => {
      try {
        const [statusResponse, vatResponse] = await Promise.all([
          axios.get(`${ServerIP}/auth/order-statuses`),
          axios.get(`${ServerIP}/auth/jomcontrol/VAT`),
        ]);

        if (statusResponse.data.Status) {
          const statuses = statusResponse.data.Result;
          localStorage.setItem(
            "orderStatuses",
            JSON.stringify({
              data: statuses,
              timestamp: Date.now(),
            })
          );
          setStatusOptions(statuses);
        }

        if (vatResponse.data.Status) {
          setVatRate(vatResponse.data.Result.vatPercent);
        }
      } catch (error) {
        console.error("Error loading static data:", error);
      }
    };

    loadStaticData();
  }, []);

  useEffect(() => {
    console.log("useEffect fetchOrderData");
    const fetchOrderData = async () => {
      if (!id) return;

      setIsLoading(true);
      const token = localStorage.getItem("token");
      try {
        const [orderResponse, detailsResponse] = await Promise.all([
          axios.get(`${ServerIP}/auth/order/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${ServerIP}/auth/order_details/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (orderResponse.data.Status) {
          console.log("PaymentView data received:", orderResponse.data.Result); // Debug log
          setData(orderResponse.data.Result);
          setNoteDraft(orderResponse.data.Result?.note || "");
          setIsEditingNote(false);
        }
        if (detailsResponse.data.Status) {
          setOrderDetails(detailsResponse.data.Result);
        }
      } catch (err) {
        handleApiError(err, navigate);
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to load payment details",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [id, navigate]);

  // Memoize formatted dates
  const formattedDates = useMemo(
    () => ({
      readyDate: data.readyDate ? formatDateTime(data.readyDate) : "",
      billDate: data.billDate ? formatDateTime(data.billDate) : "",
      productionDate: data.productionDate
        ? formatDateTime(data.productionDate)
        : "",
      deliveryDate: data.deliveryDate ? formatDateTime(data.deliveryDate) : "",
    }),
    [data.readyDate, data.billDate, data.productionDate, data.deliveryDate]
  );

  // Add handler for payment selection
  const handlePaymentSelect = (payId) => {
    setSelectedPayId(payId);
    // Switch to Payment Info tab
    document.getElementById("other-info-tab").click();
  };

  const handleEditNote = () => {
    setNoteDraft(data.note || "");
    setIsEditingNote(true);
  };

  const handleCancelNoteEdit = () => {
    setNoteDraft(data.note || "");
    setIsEditingNote(false);
  };

  const handleSaveNote = async () => {
    try {
      setIsSavingNote(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update-order-note`,
        {
          orderId: id,
          note: noteDraft,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        setData((prev) => ({ ...prev, note: noteDraft }));
        setIsEditingNote(false);
        setAlert({
          show: true,
          title: "Success",
          message: "Note saved successfully",
          type: "alert",
        });
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to save note",
          type: "alert",
        });
      }
    } catch (err) {
      setAlert({
        show: true,
        title: "Error",
        message: err.message || "Failed to save note",
        type: "alert",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight for accurate date comparison

  // Safely handle hold and overdue dates
  const holdDate = parseDateValue(data.hold);
  const overdueDate = parseDateValue(data.overdue);

  // Only apply styling if dates are valid
  const rowClass =
    holdDate && currentDate > holdDate
      ? "table-danger"
      : overdueDate && currentDate > overdueDate
      ? "table-warning"
      : "";

  // Add function to fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await axios.get(`${ServerIP}/auth/invoices/${id}`);
      if (response.data.Status) {
        setInvoices(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Add useEffect to fetch invoices when component mounts
  useEffect(() => {
    if (show) {
      fetchInvoices();
    }
  }, [show, id]);

  return (
    <div
      className="prod-page-background"
      style={{ backgroundColor: backgroundColor }}
    >
      <div className="px-4 mt-3">
        <div className="p-3 rounded border">
          <div className="mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <h3 className="m-0">
                Order # {data.orderId}{" "}
                {data.revision > 0 && (
                  <span className="text-muted ms-2">Rev.{data.revision}</span>
                )}
              </h3>
            </div>
            <div className="m-0">
              <h3>DR # {data.drNum}</h3>
            </div>
            <div className="m-0">
              <h3>INV # {data.invoiceNum}</h3>
            </div>
            <div className="d-flex gap-2">
              <Button variant="cancel" onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </div>

          <div className="d-flex order-header-container">
            <div className="row g-0 flex-grow-1 order-content">
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Order Date</label>
                  <div className="form-input">{data.orderDate || ""}</div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Prepared By</label>
                  <div className="form-input">{data.preparedByName || ""}</div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Terms</label>
                  <div className="form-input">{data.terms || ""}</div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">DR Date</label>
                  <div className="form-input">{formatDate(data.drDate)}</div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label
                    htmlFor="client"
                    className="form-label"
                    style={getClientBackgroundStyle(data)}
                  >
                    Client
                  </label>
                  <div className="form-input">{data.clientName || ""}</div>
                </div>
              </div>
              <div className="col-8 order-info-row">
                <div className="d-flex flex-column">
                  <label
                    htmlFor="client"
                    className="form-label"
                    style={getClientBackgroundStyle(data)}
                  >
                    Customer Name
                  </label>
                  <div className="form-input">{data.customerName || ""}</div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Project Name</label>
                  <div className="form-input">{data.projectName || ""}</div>
                </div>
              </div>{" "}
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Ordered By</label>
                  <div className="form-input">{data.orderedBy || ""}</div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Order Reference</label>
                  <div className="form-input">{data.orderReference || ""}</div>
                </div>
              </div>
              <div className="col-2 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Cell Number</label>
                  <div className="form-input">{data.cellNumber || ""}</div>
                </div>
              </div>
              <div className="col-2 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Due Date</label>
                  <div className="form-input">{data.dueDate || ""}</div>
                </div>
              </div>
              <div className="col-2 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Graphics By</label>
                  <div className="form-input">{data.graphicsByName || ""}</div>
                </div>
              </div>
              <div className="col-2 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Grand Total</label>
                  <div className="form-input">
                    <strong>{formatPeso(data.grandTotal)}</strong>
                  </div>
                </div>
              </div>
              <div className="col-2 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Amount Paid</label>
                  <div className="form-input">
                    <strong>{formatPeso(data.amountPaid)}</strong>
                  </div>
                </div>
              </div>
              <div className="col-2 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Balance</label>
                  <div className="form-input">
                    <strong>
                      {/* {formatPeso(data.grandTotal - data.amountPaid)}{" "} */}
                      {(() => {
                        const balance =
                          data.grandTotal - (data.amountPaid || 0);
                        const grandTotalNetOfVat =
                          data.grandTotal / (1 + vatRate / 100);
                        const balancePercentage =
                          (balance / grandTotalNetOfVat) * 100;
                        return balance > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "0.5rem",
                            }}
                          >
                            <div>{formatPeso(balance)}</div>
                            <div className="text-muted small">
                              {balancePercentage.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          ""
                        );
                      })()}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex flex-column">
                  <label className="form-label">Special Instructions</label>
                  <textarea
                    className="form-input multiline"
                    value={data.specialInst || ""}
                    readOnly
                  />
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex flex-column">
                  <label className="form-label">Delivery Instructions</label>
                  <textarea
                    className="form-input multiline"
                    value={data.deliveryInst || ""}
                    readOnly
                  />
                </div>
              </div>
              <div className="col-12 mt-2 d-flex">
                <div className="me-3">
                  <span>
                    <label className="form-label me-2">
                      Sample:
                      {data.sample ? (
                        <i className="bi bi-check-circle text-success ms-1"></i>
                      ) : (
                        ""
                      )}
                    </label>
                  </span>
                </div>
                <div>
                  <span>
                    <label className="form-label me-2">
                      Reprint:
                      {data.reprint ? (
                        <i className="bi bi-check-circle text-success ms-1"></i>
                      ) : (
                        ""
                      )}
                    </label>
                  </span>
                </div>
              </div>
            </div>

            <div className="right-panel">
              {/* Tab Navigation */}
              <div className="tab-navigation">
                <button
                  className={`tab-button ${
                    activeTab === "info" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("info")}
                >
                  Info
                </button>
                <button
                  className={`tab-button ${
                    activeTab === "log" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("log")}
                >
                  Log
                </button>
                <button
                  className={`tab-button ${
                    activeTab === "note" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("note")}
                >
                  Note
                </button>
              </div>

              {/* Tab Content */}
              <div className="right-panel-content">
                {activeTab === "info" && (
                  <>
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
                      <div className="info-value">
                        {localStorage.getItem("userName") || ""}
                      </div>
                    </div>

                    <div className="info-group">
                      <div className="info-label">Last Edited</div>
                      <div className="info-value">
                        {formatDateTime(data.lastEdited)}
                      </div>
                    </div>

                    <div className="info-group">
                      <div className="info-group-row">
                        <div className="info-label">Total Hours:</div>
                        <div className="info-value">
                          {formatNumber(data.totalHrs)}
                        </div>
                      </div>
                    </div>

                    <div className="info-group">
                      <div className="info-label">Production Date</div>
                      <div className="info-value">
                        {formattedDates.productionDate}
                      </div>
                    </div>

                    <div className="info-group">
                      <div className="info-label">Ready Date</div>
                      <div className="info-value">
                        {formattedDates.readyDate}
                      </div>
                    </div>

                    <div className="info-group">
                      <div className="info-label">Delivery Date</div>
                      <div className="info-value">
                        {formattedDates.deliveryDate}
                      </div>
                    </div>

                    <div className="info-group">
                      <div className="info-label">Bill Date</div>
                      <div className="info-value">
                        {formattedDates.billDate}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "log" && (
                  <div className="log-content">
                    <div className="log-entries">
                      {data.log ? (
                        <pre className="log-text">{data.log}</pre>
                      ) : (
                        <div className="info-value">No log entries</div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "note" && (
                  <div className="note-content">
                    {!isEditingNote ? (
                      <>
                        <div className="note-display">
                          {data.note ? (
                            <pre className="note-text">{data.note}</pre>
                          ) : (
                            <span className="text-muted">No note saved.</span>
                          )}
                        </div>
                        <Button variant="edit" onClick={handleEditNote}>
                          {data.note ? "Edit Note" : "Add Note"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <textarea
                          id="payment-note"
                          className="form-control"
                          rows={6}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          disabled={isSavingNote}
                        />
                        <div className="d-flex justify-content-end gap-2 mt-3">
                          <Button
                            variant="cancel"
                            onClick={handleCancelNoteEdit}
                            disabled={isSavingNote}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="save"
                            onClick={handleSaveNote}
                            disabled={isSavingNote}
                          >
                            {isSavingNote ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ul className="nav nav-tabs" id="orderTabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link active"
                  id="payment-history-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#payment-history"
                  type="button"
                  role="tab"
                  aria-controls="payment-history"
                  aria-selected="true"
                >
                  Payment History
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link"
                  id="other-info-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#other-info"
                  type="button"
                  role="tab"
                  aria-controls="other-info"
                  aria-selected="false"
                >
                  Payment Info
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link"
                  id="invoice-info-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#invoice-info"
                  type="button"
                  role="tab"
                  aria-controls="invoice-info"
                  aria-selected="false"
                >
                  Invoice Info
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link"
                  id="order-details-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#order-details"
                  type="button"
                  role="tab"
                  aria-controls="order-details"
                  aria-selected="false"
                >
                  Order Details
                </button>
              </li>
            </ul>

            <div className="tab-content" id="orderTabsContent">
              <div
                className="tab-pane fade show active"
                id="payment-history"
                role="tabpanel"
                aria-labelledby="payment-history-tab"
              >
                <PaymentHistory
                  orderId={id}
                  onPaymentSelect={handlePaymentSelect}
                />
              </div>

              <div
                className="tab-pane fade"
                id="other-info"
                role="tabpanel"
                aria-labelledby="other-info-tab"
              >
                <PaymentAllocation payId={selectedPayId} />
              </div>

              <div
                className="tab-pane fade"
                id="invoice-info"
                role="tabpanel"
                aria-labelledby="invoice-info-tab"
              >
                {loadingInvoices ? (
                  <div className="text-center my-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : invoices.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th className="text-center">Invoice Number</th>
                          <th className="text-center">Amount</th>
                          <th className="text-center">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="text-center">
                              {invoice.invoicePrefix + invoice.invoiceNumber}
                            </td>
                            <td className="text-end">
                              {formatPeso(invoice.invoiceAmount)}
                            </td>
                            <td className="text-center">
                              {invoice.invoiceRemarks || ""}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: "2px solid lightgrey" }}>
                          <td colSpan="2" className="text-end pe-2">
                            <strong>
                              Total:{" "}
                              {formatPeso(
                                invoices.reduce(
                                  (sum, invoice) =>
                                    sum + parseFloat(invoice.invoiceAmount),
                                  0
                                )
                              )}
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info" role="alert">
                    No invoices found for this order
                  </div>
                )}
              </div>

              <div
                className="tab-pane fade"
                id="order-details"
                role="tabpanel"
                aria-labelledby="order-details-tab"
              >
                <table className="table detail table-striped">
                  <thead>
                    <tr>
                      <th className="text-center">Qty</th>
                      <th className="text-center">Width</th>
                      <th className="text-center">Height</th>
                      <th className="text-center">Unit</th>
                      <th className="text-center">Material</th>
                      <th className="text-center">Per Sq Ft</th>
                      <th className="text-center">Price</th>
                      <th className="text-center">Disc%</th>
                      <th className="text-center">Amount</th>
                      <th className="text-center">Description</th>
                      <th className="text-center">JO Remarks</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails.map((detail) => (
                      <tr
                        key={`${detail.orderId}_${detail.displayOrder}`}
                        className={`${rowClass} ${
                          detail.noPrint === 1 ? "no-print" : ""
                        }`}
                      >
                        <td className="centered-cell">
                          {Number(detail.quantity).toLocaleString()}
                        </td>
                        <td className="centered-cell">{detail.width}</td>
                        <td className="centered-cell">{detail.height}</td>
                        <td className="centered-cell">{detail.unit}</td>
                        <td className="centered-cell">{detail.material}</td>
                        <td className="centered-cell">{detail.perSqFt}</td>
                        <td className="numeric-cell">
                          {formatPeso(detail.unitPrice)}
                        </td>
                        <td className="numeric-cell">
                          {formatNumber(detail.discount)}
                        </td>
                        <td className="numeric-cell">
                          {formatPeso(detail.amount)}
                        </td>
                        <td>{detail.itemDescription}</td>
                        <td>{detail.remarks}</td>
                        <td className="text-center">
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
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid lightgrey" }}>
                      <td colSpan="8" className="text-end pe-2">
                        Subtotal:
                      </td>
                      <td className="numeric-cell">
                        {formatPeso(data.totalAmount)}
                      </td>
                      <td colSpan="3">
                        <div className="ms-3 d-flex align-items-center">
                          <div style={{ width: "100px", textAlign: "right" }}>
                            <small style={{ fontSize: "1rem" }}>
                              Date Paid:
                            </small>
                          </div>
                          <div
                            style={{ paddingLeft: "33px", textAlign: "right" }}
                          >
                            {formatDate(data.datePaid)}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="8" className="text-end pe-2">
                        Disc. Amount:
                      </td>
                      <td className="numeric-cell">
                        {formatNumber(data.amountDisc)}
                      </td>
                      <td colSpan="3">
                        <div className="ms-3 d-flex align-items-center">
                          <div style={{ width: "100px", textAlign: "right" }}>
                            <small style={{ fontSize: "1rem" }}>
                              OR Number:
                            </small>
                          </div>
                          <div>{data.orNum || ""}</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="8" className="text-end pe-2">
                        Percent Disc.:
                      </td>
                      <td className="numeric-cell">
                        {formatNumber(data.percentDisc)}%
                      </td>
                      <td colSpan="3">
                        <div className="ms-3 d-flex align-items-center">
                          <div style={{ width: "100px", textAlign: "right" }}>
                            <small style={{ fontSize: "1rem" }}>
                              Amount Paid:
                            </small>
                          </div>
                          <div style={{ width: "80px", textAlign: "right" }}>
                            {formatPeso(data.amountPaid || 0)}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="8" className="text-end pe-2">
                        Grand Total:
                      </td>
                      <td className="numeric-cell">
                        {formatPeso(data.grandTotal)}
                      </td>
                      <td colSpan="3">
                        <div className="ms-3 d-flex align-items-center">
                          <div style={{ width: "100px", textAlign: "right" }}>
                            <small style={{ fontSize: "1rem" }}>Balance:</small>
                          </div>
                          <div style={{ width: "80px", textAlign: "right" }}>
                            {formatPeso(
                              data.grandTotal - (data.amountPaid || 0)
                            )}
                          </div>
                          <div className="ms-2">
                            <small style={{ fontSize: "1rem" }}>
                              (
                              {data.grandTotal > 0
                                ? (
                                    ((data.grandTotal -
                                      (data.amountPaid || 0)) /
                                      data.grandTotal) *
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
            </div>
          </div>
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
        />
      </div>
    </div>
  );
}

export default PaymentView;
