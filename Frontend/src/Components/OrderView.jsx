import axios from "../utils/axiosConfig";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Button from "./UI/Button";
import { BiRectangle } from "react-icons/bi";
import "./AddOrder.css";
import "./Orders.css";
import "./OrderView.css";
import { formatNumber, formatPeso, handleApiError } from "../utils/orderUtils";
import Modal from "./UI/Modal";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

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

  const location = useLocation(); // Get the current route path
  console.log(location);
  console.log(location.pathname.includes("/prod/view"));

  let backgroundColor = "#f0f8ff";
  switch (true) {
    case location.pathname.includes("/prod/view"):
      backgroundColor = "#95fbd7"; // Light Green for Production
      break;
    case location.pathname.includes("/artistlog/view"):
      backgroundColor = "#faaa87"; // Light Green for Production
      break;
    case location.pathname.includes("/printlog/view"):
      backgroundColor = "#b0dcfe"; // Light Green for Production
      break;
    case location.pathname.includes("/payment/view"):
      backgroundColor = "#fcd0f2"; // Light Green for Production
      break;
  }

  const isProdView = location.pathname.includes("/prod/view");

  // Add ESC key handler
  useEffect(() => {
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
            setData(orderData);
          }
        })
        .catch((err) => handleApiError(err, navigate));
    }
  }, [id, navigate]);
  console.log("Order View Data", data);

  useEffect(() => {
    if (id) {
      const token = localStorage.getItem("token");
      axios
        .get(`${ServerIP}/auth/order_details/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((result) => {
          if (result.data.Status) {
            setOrderDetails(result.data.Result);
          }
        })
        .catch((err) => handleApiError(err, navigate));
    }
  }, [id, navigate]);

  // Add function to handle DR printing
  const handlePrintDR = () => {
    const orderInfo = {
      orderId: data.orderId,
      clientName: data.clientName,
      customerName: data.customerName,
      projectName: data.projectName,
      drNum: data.drNum,
      drDate: data.drDate,
      order_details: orderDetails
        .filter((detail) => !detail.noPrint) // Filter out noPrint records
        .map((detail) => ({
          quantity: detail.quantity,
          width: detail.width,
          height: detail.height,
          unit: detail.unit,
          material: detail.material,
          itemDescription: detail.itemDescription,
          unitPrice: detail.unitPrice,
          discount: detail.discount,
          amount: detail.amount,
        })),
      deliveryInst: data.deliveryInst,
      totalAmount: data.totalAmount,
      amountDisc: data.amountDisc,
      grandTotal: data.grandTotal,
    };

    navigate("/dashboard/prod_print_one_dr", { state: { orderInfo } });
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
                Order # {data.orderId}
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
              {isProdView && (
                <Button variant="print" onClick={handlePrintDR}>
                  Print DR
                </Button>
              )}
              <Button variant="cancel" onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </div>

          <div className="d-flex order-header-container">
            <div className="row g-0 flex-grow-1 order-content">
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-order-date" className="form-label">
                    Order Date
                  </label>
                  <div id="view-order-date" className="form-input">
                    {data.orderDate || ""}
                  </div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-prepared-by" className="form-label">
                    Prepared By
                  </label>
                  <div id="view-prepared-by" className="form-input">
                    {data.preparedByName || ""}
                  </div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-terms" className="form-label">
                    Terms
                  </label>
                  <div id="view-terms" className="form-input">
                    {data.terms || ""}
                  </div>
                </div>
              </div>
              <div className="col-4 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-client" className="form-label">
                    Client
                  </label>
                  <div id="view-client" className="form-input">
                    {data.clientName || ""}
                  </div>
                </div>
              </div>
              <div className="col-8 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-customer-name" className="form-label">
                    Customer Name
                  </label>
                  <div id="view-customer-name" className="form-input">
                    {data.customerName || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-dr-date" className="form-label">
                    DR Date
                  </label>
                  <div id="view-dr-date" className="form-input">
                    {data.drDate || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-project" className="form-label">
                    Project Name
                  </label>
                  <div id="view-project" className="form-input">
                    {data.projectName || ""}
                  </div>
                </div>
              </div>{" "}
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-ordered-by" className="form-label">
                    Ordered By
                  </label>
                  <div id="view-ordered-by" className="form-input">
                    {data.orderedBy || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-order-ref" className="form-label">
                    Order Reference
                  </label>
                  <div id="view-order-ref" className="form-input">
                    {data.orderReference || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-cell-number" className="form-label">
                    Cell Number
                  </label>
                  <div id="view-cell-number" className="form-input">
                    {data.cellNumber || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-due-date" className="form-label">
                    Due Date
                  </label>
                  <div id="view-due-date" className="form-input">
                    {data.dueDate || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-due-time" className="form-label">
                    Due Time
                  </label>
                  <div id="view-due-time" className="form-input">
                    {data.dueTime || ""}
                  </div>
                </div>
              </div>
              <div className="col-3 order-info-row">
                <div className="d-flex flex-column">
                  <label htmlFor="view-graphics-by" className="form-label">
                    Graphics By
                  </label>
                  <div id="view-graphics-by" className="form-input">
                    {data.graphicsByName || ""}
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex flex-column">
                  <label htmlFor="view-special-inst" className="form-label">
                    Special Instructions
                  </label>
                  <textarea
                    className="form-input multiline"
                    value={data.specialInst || ""}
                    readOnly
                  />
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex flex-column">
                  <label htmlFor="view-delivery-inst" className="form-label">
                    Delivery Instructions
                  </label>
                  <textarea
                    className="form-input multiline"
                    value={data.deliveryInst || ""}
                    readOnly
                  />
                </div>
              </div>
              <div className="col-12 mt-2 d-flex">
                <div className="me-3">
                  <label htmlFor="view-sample" className="form-label me-2">
                    Sample:
                    {data.sample ? (
                      <i className="bi bi-check-circle text-success ms-1"></i>
                    ) : (
                      ""
                    )}
                  </label>
                  <input
                    type="checkbox"
                    id="view-sample"
                    checked={data.sample || false}
                    disabled
                    className="d-none"
                  />
                </div>
                <div>
                  <label htmlFor="view-reprint" className="form-label me-2">
                    Reprint:
                    {data.reprint ? (
                      <i className="bi bi-check-circle text-success ms-1"></i>
                    ) : (
                      ""
                    )}
                  </label>
                  <input
                    type="checkbox"
                    id="view-reprint"
                    checked={data.reprint || false}
                    disabled
                    className="d-none"
                  />
                </div>
              </div>
            </div>

            <div className="right-panel">
              <div className="info-group">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="info-label mb-0">Status:</div>
                  <span
                    className={`status-badge ${data.status || "default"}`}
                    style={{ cursor: "default" }}
                  >
                    {data.status || "N/A"}
                  </span>
                </div>
              </div>

              <div className="info-group">
                <div className="info-label">Edited By</div>
                <div className="info-value">{data.editedBy || ""}</div>
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
                    : ""}
                </div>
              </div>

              <div className="info-group">
                <label htmlFor="view-ready-date" className="info-label">
                  Ready Date
                </label>
                <div id="view-ready-date" className="info-value">
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
                    : ""}
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
                    : ""}
                </div>
              </div>

              <div className="info-group">
                <label htmlFor="view-bill-date" className="info-label">
                  Bill Date
                </label>
                <div id="view-bill-date" className="info-value">
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
                    : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h5>Order Details List</h5>
            <table className="table detail table-striped">
              <thead>
                <tr>
                  <th>Qty</th>
                  <th>Width</th>
                  <th>Height</th>
                  <th>Unit</th>
                  <th>Material</th>
                  <th>Per Sq Ft</th>
                  <th>Price</th>
                  <th>Disc%</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>JO Remarks</th>
                  <th>Action</th>
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
                    <td className="text-center">
                      <Button
                        variant="view"
                        iconOnly
                        size="sm"
                        icon={<BiRectangle size={14} />}
                        onMouseOver={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
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
                    {formatNumber(data.totalAmount)}
                  </td>
                  <td colSpan="3">
                    <div className="ms-3 d-flex align-items-center">
                      <div style={{ width: "100px", textAlign: "right" }}>
                        <small style={{ fontSize: "1rem" }}>Date Paid:</small>
                      </div>
                      <div>{data.datePaid || ""}</div>
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
                        <small style={{ fontSize: "1rem" }}>OR Number:</small>
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
                        <small style={{ fontSize: "1rem" }}>Amount Paid:</small>
                      </div>
                      <div style={{ width: "80px", textAlign: "right" }}>
                        {formatNumber(data.amountPaid || 0)}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan="8" className="text-end pe-2">
                    Grand Total:
                  </td>
                  <td className="numeric-cell">
                    {formatNumber(data.grandTotal)}
                  </td>
                  <td colSpan="3">
                    <div className="ms-3 d-flex align-items-center">
                      <div style={{ width: "100px", textAlign: "right" }}>
                        <small style={{ fontSize: "1rem" }}>Balance:</small>
                      </div>
                      <div style={{ width: "80px", textAlign: "right" }}>
                        {formatNumber(data.grandTotal - (data.amountPaid || 0))}
                      </div>
                      <div className="ms-2">
                        <small style={{ fontSize: "1rem" }}>
                          (
                          {data.grandTotal > 0
                            ? (
                                ((data.grandTotal - (data.amountPaid || 0)) /
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
