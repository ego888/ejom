import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { formatNumber, formatPeso } from "../utils/orderUtils";
import PropTypes from "prop-types";

function PaymentHistory({ orderId, onPaymentSelect }) {
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    if (orderId) {
      const fetchPaymentHistory = async () => {
        try {
          const response = await axios.get(
            `${ServerIP}/auth/order-payment-history`,
            {
              params: { orderId },
            }
          );
          console.log("PAY HISTORY", response.data);
          if (response.data.Status) {
            setPaymentHistory(response.data.paymentDetails);
          }
        } catch (error) {
          console.error("Error fetching payment history:", error);
        }
      };

      fetchPaymentHistory();
    }
  }, [orderId]);

  // Calculate total amount
  const totalAmount = paymentHistory.reduce(
    (sum, payment) => sum + Number(payment.amountApplied),
    0
  );

  return (
    <table className="table table-striped">
      <thead>
        <tr>
          <th>Pay ID</th>
          <th>Date</th>
          <th className="text-center">Type</th>
          <th className="text-center">OR#</th>
          <th>Amount</th>
          <th>Reference</th>
          <th>Posted By</th>
          <th>Posted Date</th>
          <th>Remitted By</th>
          <th>Remitted Date</th>
        </tr>
      </thead>
      <tbody>
        {paymentHistory.map((payment, index) => (
          <tr key={index}>
            <td id="payId" className="text-center">
              <button
                className="btn btn-link p-0"
                onClick={() => onPaymentSelect(payment.payId)}
                style={{
                  textDecoration: "none",
                  color: "#0d6efd",
                  cursor: "pointer",
                }}
              >
                {payment.payId}
              </button>
            </td>
            <td id="paydate">
              {new Date(payment.payDate).toLocaleDateString()}
            </td>
            <td id="paytype" className="text-center">
              {payment.payType}
            </td>
            <td id="ornum" className="text-center">
              {payment.ornum}
            </td>
            <td id="amount" className="text-center">
              {formatNumber(payment.amountApplied)}
            </td>
            <td id="payreference">{payment.payReference}</td>
            <td id="transactedby">{payment.transactedBy}</td>
            <td id="posteddate">
              {payment.postedDate
                ? new Date(payment.postedDate).toLocaleDateString()
                : ""}
            </td>
            <td id="remittedby">{payment.remittedBy}</td>
            <td id="remitteddate">
              {payment.remittedDate
                ? new Date(payment.remittedDate).toLocaleDateString()
                : ""}
            </td>
          </tr>
        ))}

        {/* Add total row */}
        <tr className="table-active">
          <td colSpan="4" className="text-end fw-bold">
            Total:
          </td>
          <td className="text-right fw-bold">{formatNumber(totalAmount)}</td>
          <td colSpan="5"></td>
        </tr>
      </tbody>
    </table>
  );
}

PaymentHistory.propTypes = {
  orderId: PropTypes.string.isRequired,
  onPaymentSelect: PropTypes.func.isRequired,
};

export default PaymentHistory;
