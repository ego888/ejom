import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { formatNumber } from "../utils/orderUtils";

function PaymentHistory({ orderId }) {
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
          <th>Type</th>
          <th>OR#</th>
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
            <td>{payment.payId}</td>
            <td>{new Date(payment.payDate).toLocaleDateString()}</td>
            <td>{payment.payType}</td>
            <td>{payment.ornum}</td>
            <td className="text-right">
              {formatNumber(payment.amountApplied)}
            </td>
            <td>{payment.payReference}</td>
            <td>{payment.transactedBy}</td>
            <td>
              {payment.postedDate
                ? new Date(payment.postedDate).toLocaleDateString()
                : ""}
            </td>
            <td>{payment.remittedBy}</td>
            <td>
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

export default PaymentHistory;
