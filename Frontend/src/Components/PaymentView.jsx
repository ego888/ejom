import axios from "../utils/axiosConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Button from "./UI/Button";
import { BiRectangle } from "react-icons/bi";
import "./AddOrder.css";
import "./Orders.css";
import "./PaymentView.css";
import { formatNumber, formatPeso, handleApiError } from "../utils/orderUtils";
import Modal from "./UI/Modal";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import PaymentHistory from "./PaymentHistory";
import { formatDateTime } from "../utils/orderUtils";
import PaymentAllocation from "./PaymentAllocation";
import { getClientBackgroundStyle } from "../utils/clientOverdueStyle";

function OrderView() {
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
      const cachedStatuses = getCachedData("orderStatuses");
      if (cachedStatuses) {
        setStatusOptions(cachedStatuses);
      } else {
        // Fetch and cache
        const response = await axios.get(`${ServerIP}/auth/order-statuses`);
        if (response.data.Status) {
          const statuses = response.data.Result;
          localStorage.setItem(
            "orderStatuses",
            JSON.stringify({
              data: statuses,
              timestamp: Date.now(),
            })
          );
          setStatusOptions(statuses);
        }
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
          setData(orderResponse.data.Result);
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
                  <div className="form-input">
                    {new Date(data.drDate).toLocaleDateString() || ""}
                  </div>
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
              <div className="col-4 order-info-row">
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
                  <label className="form-label">Due Time</label>
                  <div className="form-input">{data.dueTime || ""}</div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label className="form-label">Graphics By</label>
                  <div className="form-input">{data.graphicsByName || ""}</div>
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
              <div className="info-group">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="info-label mb-0">Status:</div>
                  <span className={`status-badge ${data.status || "default"}`}>
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
                    : ""}
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
                <div className="info-value">{formattedDates.readyDate}</div>
              </div>

              <div className="info-group">
                <div className="info-label">Delivery Date</div>
                <div className="info-value">{formattedDates.deliveryDate}</div>
              </div>

              <div className="info-group">
                <div className="info-label">Bill Date</div>
                <div className="info-value">{formattedDates.billDate}</div>
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
                        className={detail.noPrint === 1 ? "no-print" : ""}
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
                            {new Date(data.datePaid).toLocaleDateString() || ""}
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

export default OrderView;
