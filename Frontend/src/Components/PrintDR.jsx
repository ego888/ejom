import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import ModalAlert from "./UI/ModalAlert";
import axios from "../utils/axiosConfig"; // Import configured axios
import { ServerIP } from "../config";
import { useNavigate } from "react-router-dom";

function PrintDR({ data }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });
  const navigate = useNavigate();

  // Add debug logging
  useEffect(() => {
    console.log("PrintDR Data:", data);
    if (data && data.length > 0) {
      console.log("First Order Details:", data[0].order_details);
      console.log("First Order Totals:", {
        totalAmount: data[0].totalAmount,
        amountDisc: data[0].amountDisc,
        grandTotal: data[0].grandTotal,
      });
      // Log the first detail to see its structure
      if (data[0].order_details && data[0].order_details.length > 0) {
        console.log("First Detail Structure:", data[0].order_details[0]);
      }
    }
  }, [data]);

  const calculatePages = (details = [], rowsPerPage = 11) => {
    if (!details || details.length === 0) return 1;
    if (details.length >= 9 && details.length <= 11) return 2;
    return Math.ceil(details.length / rowsPerPage);
  };

  const handleConfirmPrint = async () => {
    try {
      // Construct update data from the data we used for printing
      const updateData = data.map((order) => ({
        orderID: order.orderId || order.id,
        drnum: order.drNum.toString(),
        drDate: order.drDate,
      }));

      console.log("Data being sent:", updateData); // Debug log
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update_orders_drnum`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.Status) {
        throw new Error(response.data.Error || "Failed to update DR numbers");
      }

      setAlert({
        show: true,
        title: "Success",
        message: "DR numbers have been successfully updated",
        type: "alert",
      });

      // Navigate back after showing success message
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      console.error("Error updating DR numbers:", err.response?.data || err); // Debug log
      setAlert({
        show: true,
        title: "Error",
        message: err.message || "Failed to update DR numbers",
        type: "alert",
      });
    }
  };

  useEffect(() => {
    // Trigger print after a short delay to ensure content is rendered
    const printTimeout = setTimeout(() => {
      window.print();
      // Show confirmation dialog after printing
      setShowConfirmation(true);
    }, 500);

    return () => {
      clearTimeout(printTimeout);
    };
  }, []);

  return (
    <>
      <div className="dr-pages">
        {data.map((order, orderIndex) => {
          const rowsPerPage = 11;
          const totalPages = calculatePages(order.order_details, rowsPerPage);
          const needsExtraPage =
            order.order_details &&
            order.order_details.length >= 9 &&
            order.order_details.length <= 11;

          return Array.from({ length: totalPages }).map((_, pageIndex) => (
            <div
              key={`${order.orderId || order.id}-${pageIndex}`}
              className={`dr-page ${
                orderIndex < data.length - 1 || pageIndex < totalPages - 1
                  ? "page-break"
                  : ""
              }`}
            >
              {pageIndex === 0 && (
                <>
                  <div className="title">DELIVERY RECEIPT</div>
                  <div className="qr-code">
                    <QRCodeSVG
                      value={(order.orderId || order.id || "").toString()}
                      size={100}
                    />
                  </div>
                  <div className="info-section">
                    <div className="info-row">
                      <div className="info-label text-center">DR No.:</div>
                      <div className="info-value">{order.drNum || ""}</div>
                    </div>
                    <div className="info-row">
                      <div className="info-label text-center">Date:</div>
                      <div className="info-value">{order.drDate || ""}</div>
                    </div>
                    <div className="info-row">
                      <div className="info-label text-center">Client:</div>
                      <div className="info-value">{order.clientName || ""}</div>
                    </div>
                    <div className="info-row">
                      <div className="info-label text-center">
                        Project Name:
                      </div>
                      <div className="info-value">
                        {order.projectName || ""}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(!needsExtraPage || pageIndex < totalPages - 1) && (
                <table className="dr-table">
                  <thead>
                    <tr>
                      <th className="text-center">Qty</th>
                      <th className="text-center">Size</th>
                      <th className="text-center">Material - Description</th>
                      <th className="text-center">Unit Price</th>
                      {order.order_details?.some(
                        (detail) => detail.discount && detail.discount !== 0
                      ) && <th className="text-center">Discount</th>}
                      <th className="text-center">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.order_details || [])
                      .slice(
                        pageIndex * rowsPerPage,
                        (pageIndex + 1) * rowsPerPage
                      )
                      .map((detail, idx) => {
                        // Add debug logging for each detail
                        console.log(`Detail ${idx}:`, {
                          unitPrice: detail.unit_price || detail.unitPrice,
                          discount: detail.discount_amount || detail.discount,
                          amount: detail.total_amount || detail.amount,
                          rawDetail: detail,
                        });
                        return (
                          <tr key={idx}>
                            <td className="text-center">
                              {detail.quantity && detail.quantity !== 0
                                ? detail.quantity
                                : ""}
                            </td>
                            <td className="text-center">
                              {detail.width || detail.height
                                ? `${detail.width || ""} ${
                                    detail.height ? "x " + detail.height : ""
                                  } ${detail.unit || ""}`
                                : ""}
                            </td>
                            <td>
                              {detail.material}
                              {detail.itemDescription
                                ? " - " + detail.itemDescription
                                : ""}
                            </td>
                            <td className="text-end">
                              {detail.unitPrice !== 0 ? detail.unitPrice : ""}
                            </td>
                            {order.order_details?.some(
                              (d) => d.discount !== 0
                            ) && (
                              <td className="text-end">
                                {detail.discount !== 0 ? detail.discount : ""}
                              </td>
                            )}
                            <td className="text-end">
                              {detail.amount !== 0 ? detail.amount : ""}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {((needsExtraPage && pageIndex === totalPages - 1) ||
                (!needsExtraPage && pageIndex === totalPages - 1)) && (
                <div className="bottom-section">
                  <div className="delivery-instructions">
                    <div className="delivery-label">Delivery Instructions:</div>
                    <div className="info-value">{order.deliveryInst || ""}</div>
                  </div>
                  <div className="right-section">
                    <div className="totals-section">
                      {Number(order.amountDisc) === 0 ? (
                        <div className="total-row grand-total">
                          <div className="total-label">Grand Total:</div>
                          <div className="total-value">{order.grandTotal}</div>
                        </div>
                      ) : (
                        <>
                          <div className="total-row">
                            <div className="total-label">Total Amount:</div>
                            <div className="total-value">
                              {order.totalAmount}
                            </div>
                          </div>
                          <div className="total-row">
                            <div className="total-label">Amount Discount:</div>
                            <div className="total-value">
                              {order.amountDisc}
                            </div>
                          </div>
                          <div className="total-row grand-total">
                            <div className="total-label">Grand Total:</div>
                            <div className="total-value">
                              {order.grandTotal}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="signature-section">
                      <div className="signature-block">
                        <div className="signature-line">Received by / Date</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="page-footer">
                <div className="jo-number">JO: {order.orderId || ""}</div>
                <div className="page-number">
                  Page {pageIndex + 1} of {totalPages}
                </div>
              </div>
            </div>
          ));
        })}

        <style>
          {`
            @media print {
              @page {
                size: A5 landscape;
                margin: 0.25in;
              }
              body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .page-break {
                page-break-after: always;
              }
            }

            .dr-page {
              width: 8.3in;
              height: 5.6in;
              padding: 0.5in;
              position: relative;
              font-family: Arial, sans-serif;
              font-size: 12px;
              page-break-after: always;
            }

            .dr-page:last-child {
              page-break-after: auto;
            }

            .title {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
            }

            .qr-code {
              position: absolute;
              top: 0.5in;
              right: 0.5in;
            }

            .info-section {
            }

            .info-row {
              display: flex;
              margin-bottom: 2px;
              font-size: 12px;
            }

            .info-label {
              width: 120px;
              font-weight: bold;
              font-size: 12px;
              padding-right: 2px;
            }

            .info-value {
              flex: 1;
              font-size: 12px;
            }

            .delivery-label {
              font-weight: bold;
              font-size: 12px;
            }

            .delivery-instructions {
              flex: 0 0 70%;
              padding: 5px;
              border: 1px solid rgb(29, 29, 29);
              border-radius: 8px;
              min-height: 60px;
              font-size: 12px;
            }

            .dr-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: ${(props) => (props.isFirstPage ? "0" : "20px")};
            }

            .dr-table th,
            .dr-table td {
              border: 1px solid black;
              padding: 4px;
            }

            .dr-table th {
              background-color: #f0f0f0;
              font-weight: bold;
            }

            .dr-table th:nth-child(1),
            .dr-table td:nth-child(1) {
              width: 10%;  /* Fixed width for Quantity column */
            }

            .dr-table th:nth-child(2),
            .dr-table td:nth-child(2) {
              width: 20%;  /* Fixed width for Size column */
            }

            .dr-table th:nth-child(3),
            .dr-table td:nth-child(3) {
              width: 70%;  /* Fixed width for Material-Description column */
            }
              
            .text-center {
              text-align: center;
            }

            .totals-section {
              padding: 5px;
              border: 1px solid rgb(29, 29, 29);
              border-radius: 8px;
              min-height: 60px;
              font-size: 12px;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              padding: 2px 5px;
              font-size: 11px;
            }

            .total-row.grand-total {
              font-weight: bold;
              border-top: 1px solid rgb(29, 29, 29);
              margin-top: 5px;
              padding-top: 5px;
            }

            .total-label {
              font-weight: bold;
              white-space: nowrap;
            }

            .total-value {
              text-align: right;
              white-space: nowrap;
            }

            .signature-section {
              margin-top: 0;
            }

            .signature-block {
              width: 100%;
            }

            .signature-line {
              border-top: 1px solid black;
              padding-top: 5px;
              text-align: center;
              font-size: 11px;
            }

            .page-footer {
              position: absolute;
              bottom: 0.25in;
              left: 0.5in;
              right: 0.5in;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
            }

            .jo-number {
              font-weight: bold;
            }

            .bottom-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 5px;
              gap: 10px;
              position: relative;
            }

            .right-section {
              flex: 0 0 30%;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
          `}
        </style>
      </div>

      <ModalAlert
        show={showConfirmation}
        title="Print Confirmation"
        message="Was the DR printing successful? Click OK to update DR numbers into Order records."
        type="confirm"
        onConfirm={handleConfirmPrint}
        onClose={() => navigate(-1)}
      />

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => {
          setAlert((prev) => ({ ...prev, show: false }));
          if (alert.title === "Success") {
            navigate(-1);
          }
        }}
      />
    </>
  );
}

export default PrintDR;
