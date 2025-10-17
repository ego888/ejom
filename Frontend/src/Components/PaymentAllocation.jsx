import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { formatPeso, handleApiError, formatDateDisplay } from "../utils/orderUtils";
import "./PaymentAllocation.css";

function PaymentAllocation({ payId }) {
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllocation = async () => {
      // Debug: Log initial payId
      console.log("PaymentAllocation - Initial payId:", payId);

      if (!payId) {
        console.log("PaymentAllocation - No payId provided");
        setLoading(false);
        setError(
          "Please select a payment from Payment History to view details"
        );
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("PaymentAllocation - Fetching data for payId:", payId);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${ServerIP}/auth/payment-allocation?payId=${payId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("PaymentAllocation - API Response:", response.data);

        if (response.data.Status) {
          setAllocation(response.data.paymentAllocation);
          console.log(
            "PaymentAllocation - Data set:",
            response.data.paymentAllocation
          );
        } else {
          console.log("PaymentAllocation - API returned false status");
          setError("Failed to load payment allocation");
        }
      } catch (err) {
        console.error("PaymentAllocation - Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        setError("Failed to load payment allocation details");
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocation();
  }, [payId]); // Re-fetch when payId changes

  // Debug: Log component state changes
  useEffect(() => {
    console.log("PaymentAllocation - State Update:", {
      payId,
      loading,
      error,
      hasAllocation: !!allocation,
    });
  }, [payId, loading, error, allocation]);

  if (loading) {
    return (
      <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-info" role="alert">
        {error}
        <div className="small text-muted mt-1">
          {payId ? `Payment ID: ${payId}` : "No payment selected"}
        </div>
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="alert alert-info" role="alert">
        Select a payment from Payment History to view details
      </div>
    );
  }

  return (
    <div className="payment-allocation">
      <div className="allocation-header">
        <h5>Payment Allocation Details</h5>
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th className="text-center">Pay ID</th>
              <th className="text-center">Pay Date</th>
              <th className="text-center">Pay Amount</th>
              <th className="text-center">Type</th>
              <th className="text-center">OR#</th>
              <th className="text-center">Reference</th>
              <th className="text-center">Order ID</th>
              <th className="text-center">Amount Applied</th>
              <th className="text-center">Posted By</th>
              <th className="text-center">Posted Date</th>
              <th className="text-center">Remitted By</th>
              <th className="text-center">Remitted Date</th>
            </tr>
          </thead>
          <tbody>
            {allocation.allocations?.map((item, index) => (
              <tr key={index}>
                <td className="text-center">
                  {index === 0 ? allocation.payId : ""}
                </td>
                <td className="text-center">
                  {index === 0 ? formatDateDisplay(allocation.payDate) : ""}
                </td>
                <td className="text-end">
                  {index === 0 ? formatPeso(allocation.totalPayment) : ""}
                </td>
                <td className="text-center">
                  {index === 0 ? allocation.payType : ""}
                </td>
                <td className="text-center">
                  {index === 0 ? allocation.ornum : ""}
                </td>
                <td className="text-center">
                  {index === 0 ? allocation.payReference : ""}
                </td>
                <td className="text-center">{item.orderId}</td>
                <td className="text-end">{formatPeso(item.amountApplied)}</td>
                <td className="text-center">
                  {index === 0 ? allocation.transactedBy : ""}
                </td>
                <td className="text-center">
                  {index === 0
                    ? allocation.postedDate
                      ? formatDateDisplay(allocation.postedDate)
                      : "N/A"
                    : ""}
                </td>
                <td className="text-center">
                  {index === 0 ? allocation.remittedBy : ""}
                </td>
                <td className="text-center">
                  {index === 0
                    ? allocation.remittedDate
                      ? formatDateDisplay(allocation.remittedDate)
                      : ""
                    : ""}
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="table-active fw-bold">
              <td colSpan="7" className="text-end">
                Total:
              </td>
              <td className="text-end">
                {formatPeso(
                  allocation.allocations?.reduce(
                    (sum, item) => sum + Number(item.amountApplied),
                    0
                  ) || 0
                )}
              </td>
              <td colSpan="4"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentAllocation;
