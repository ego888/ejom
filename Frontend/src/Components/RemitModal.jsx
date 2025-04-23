import React, { useState, useEffect } from "react";
import ModalCustom from "./UI/ModalCustom";
import { formatPeso } from "../utils/orderUtils";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import ModalAlert from "./UI/ModalAlert";

function RemitModal({ show, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [groupedPayments, setGroupedPayments] = useState({});
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "confirm",
  });

  useEffect(() => {
    if (show) {
      fetchPayments();
    }
  }, [show]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${ServerIP}/auth/unremitted-payments`);
      console.log("unremitted payments", response.data);
      if (response.data.Status) {
        setPayments(response.data.Result);
        // Group payments by payType
        const grouped = response.data.Result.reduce((acc, payment) => {
          if (!acc[payment.payType]) {
            acc[payment.payType] = [];
          }
          acc[payment.payType].push(payment);
          return acc;
        }, {});
        setGroupedPayments(grouped);
      }
    } catch (error) {
      setError("Failed to fetch payments");
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = (payments) => {
    return payments.reduce(
      (sum, payment) => sum + Number(payment.amountApplied),
      0
    );
  };

  const handlePrintRemit = () => {
    // Calculate total amount
    const totalAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amountApplied),
      0
    );

    // Create print content
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; font-size: 14px;">
        <h2 style="text-align: center;">Payment Remittance Report</h2>
        <p style="text-align: right;">Date: ${new Date().toLocaleDateString()}</p>
        
        <h3>Summary</h3>
        <table style="width: 40%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Payment Type</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Count</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Total Amount</th>
          </tr>
          ${Object.entries(groupedPayments)
            .map(
              ([type, typePayments], index) => `
            <tr style="background-color: ${
              index % 2 === 0 ? "#ffffff" : "#f8f9fa"
            };">
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${type}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${
                typePayments.length
              }</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatPeso(
                calculateSubtotal(typePayments)
              )}</td>
            </tr>
          `
            )
            .join("")}
          <tr style="background-color: #e9ecef;">
            <td colspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatPeso(
              totalAmount
            )}</strong></td>
          </tr>
        </table>

        <h3>Detailed Report</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Pay ID</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">JO #</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Client</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Order Total</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Amount Applied</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">OR#</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Date</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Type</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Amount</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Reference</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Transacted By</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa;">Posted Date</th>
          </tr>
          ${Object.entries(groupedPayments)
            .map(
              ([type, typePayments]) => `
            ${typePayments
              .map(
                (payment, index) => `
              <tr style="background-color: ${
                index % 2 === 0 ? "#ffffff" : "#f8f9fa"
              }; border-top: ${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? "2px solid #4d4d4d"
                    : "1px solid #dee2e6"
                };">
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.payId
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  payment.orderId
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  payment.clientName
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatPeso(
                  payment.grandTotal
                )}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatPeso(
                  payment.amountApplied
                )}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.ornum || "N/A"
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.payDate
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.payType
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? formatPeso(payment.amount)
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.payReference || ""
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.transactedBy
                    : ""
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  index === 0 || typePayments[index - 1].payId !== payment.payId
                    ? payment.postedDate
                    : ""
                }</td>
              </tr>
            `
              )
              .join("")}
            
              <tr style="background-color: #e9ecef;">
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Order Total & Amount Applied</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatPeso(
                  typePayments.reduce((sum, p) => sum + Number(p.grandTotal), 0)
                )}</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatPeso(
                  calculateSubtotal(typePayments)
                )}</strong></td>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">
                  <strong>Received Amount ${type}</strong>
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">
                  <strong>
                    ${formatPeso(
                      typePayments.reduce((sum, payment, index) => {
                        if (
                          index === 0 ||
                          typePayments[index - 1].payId !== payment.payId
                        ) {
                          return sum + Number(payment.amount);
                        }
                        return sum;
                      }, 0)
                    )}
                  </strong>
                </td>
                <td colSpan={2}></td>
              </tr>
          `
            )
            .join("")}
          <tr style="background-color: #e9ecef;">
            <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Order Grand Total & Amount Applied</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatPeso(
              payments.reduce((sum, p) => sum + Number(p.grandTotal), 0)
            )}</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatPeso(
              payments.reduce((sum, p) => sum + Number(p.amountApplied), 0)
            )}</strong></td>
            <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">
              <strong>Grand Total Received Amount</strong>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">
              <strong>
                ${formatPeso(
                  payments.reduce((sum, payment) => {
                    return sum + Number(payment.amount);
                  }, 0)
                )}
              </strong>
            </td>
            <td colSpan={3}></td>
        </table>
      </div>
    `;

    // Create print window
    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    // Show confirmation modal
    setAlert({
      show: true,
      title: "Confirm Remittance",
      message: `Are you sure you want to remit ${
        payments.length
      } payment(s) totaling ${formatPeso(totalAmount)}?`,
      type: "confirm",
    });
  };

  const handleConfirmRemit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${ServerIP}/auth/remit-payment`, {
        payIds: payments.map((p) => p.payId),
        remittedBy: localStorage.getItem("userName"),
      });

      if (response.data.Status) {
        setError(null);
        onClose();
      } else {
        setError(response.data.Error);
      }
    } catch (error) {
      setError("Failed to remit payments");
      console.error("Error remitting payments:", error);
    } finally {
      setLoading(false);
      setAlert((prev) => ({ ...prev, show: false }));
    }
  };

  return (
    <ModalCustom
      show={show}
      onClose={onClose}
      title="Unremitted Payments"
      width="95%"
      height="85%"
      hideCloseButton={true}
    >
      <div className="d-flex justify-content-between mb-3">
        <div className="d-flex gap-2">
          <Button variant="save" onClick={handlePrintRemit}>
            Print & Remit
          </Button>
          <Button variant="cancel" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="showDetails"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showDetails">
            Show Details
          </label>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th className="text-center">Pay ID</th>
                <th className="text-center">JO #</th>
                <th className="text-center">Client</th>
                <th className="text-center">Order Total</th>
                <th className="text-center">Amount Applied</th>
                <th className="text-center">OR#</th>
                <th className="text-center">Date</th>
                <th className="text-center">Type</th>
                <th className="text-center">Amount</th>
                <th className="text-center">Reference</th>
                <th className="text-center">Transacted By</th>
                <th className="text-center">Posted Date</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedPayments).map(([type, typePayments]) => (
                <React.Fragment key={type}>
                  {typePayments.map((payment, index) => (
                    <tr
                      key={`${payment.payId}-${payment.orderId}-${index}`}
                      style={{
                        borderTop:
                          index === 0 ||
                          typePayments[index - 1].payId !== payment.payId
                            ? "2px solid #4d4d4d"
                            : "1px solid #dee2e6",
                      }}
                    >
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.payId
                          : ""}
                      </td>
                      <td className="text-center">{payment.orderId}</td>
                      <td>{payment.clientName}</td>
                      <td className="text-end">
                        {formatPeso(payment.grandTotal)}
                      </td>
                      <td className="text-end">
                        {formatPeso(payment.amountApplied)}
                      </td>
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.ornum || "N/A"
                          : ""}
                      </td>
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.payDate
                          : ""}
                      </td>
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.payType
                          : ""}
                      </td>
                      <td className="text-end">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? formatPeso(payment.amount)
                          : ""}
                      </td>
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.payReference || ""
                          : ""}
                      </td>
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.transactedBy
                          : ""}
                      </td>
                      <td className="text-center">
                        {index === 0 ||
                        typePayments[index - 1].payId !== payment.payId
                          ? payment.postedDate
                          : ""}
                      </td>
                    </tr>
                  ))}
                  <tr className="table-secondary">
                    <td colSpan="3" className="text-end">
                      <strong>Order Total & Amount Applied</strong>
                    </td>
                    <td className="text-end">
                      <strong>
                        {formatPeso(
                          typePayments.reduce(
                            (sum, p) => sum + Number(p.grandTotal),
                            0
                          )
                        )}
                      </strong>
                    </td>
                    <td className="text-end">
                      <strong>
                        {formatPeso(calculateSubtotal(typePayments))}
                      </strong>
                    </td>
                    <td colSpan={showDetails ? 2 : 1}></td>
                    <td colSpan="2" className="text-end">
                      <strong>Received Amount {type}</strong>
                    </td>
                    <td className="text-end">
                      <strong>
                        {formatPeso(
                          typePayments.reduce((sum, payment, index) => {
                            if (
                              index === 0 ||
                              typePayments[index - 1].payId !== payment.payId
                            ) {
                              return sum + Number(payment.amount);
                            }
                            return sum;
                          }, 0)
                        )}
                      </strong>
                    </td>
                    <td colSpan={showDetails ? 3 : 3}></td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="table-primary">
                <td colSpan="4" className="text-end">
                  <strong>Grand Total Amount Applied</strong>
                </td>
                <td className="text-end">
                  <strong>
                    {formatPeso(
                      payments.reduce(
                        (sum, payment) => sum + Number(payment.amountApplied),
                        0
                      )
                    )}
                  </strong>
                </td>
                <td colSpan={showDetails ? 2 : 1}></td>
                <td colSpan="2" className="text-end">
                  <strong>Grand Total Received Amount</strong>
                </td>
                <td className="text-end">
                  <strong>
                    {formatPeso(
                      payments.reduce((sum, payment, index) => {
                        if (
                          index === 0 ||
                          payments[index - 1].payId !== payment.payId
                        ) {
                          return sum + Number(payment.amount);
                        }
                        return sum;
                      }, 0)
                    )}
                  </strong>
                </td>
                <td colSpan={showDetails ? 3 : 3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
        onConfirm={handleConfirmRemit}
      />
    </ModalCustom>
  );
}

export default RemitModal;
