import React, { useState, useEffect } from "react";
import Modal from "./UI/Modal";
import { formatPeso } from "../utils/orderUtils";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import ModalAlert from "./UI/ModalAlert";

const PaymentAllocationModal = ({
  show,
  onClose,
  paymentInfo,
  orderPayments,
  orders,
  onPostPayment,
  onCancelPayment,
  setOrderPayments,
  setCheckPay,
  setAllocationCount,
  setAllocatedAmount,
  setRemainingAmount,
  fetchOrderData,
}) => {
  const [allocationData, setAllocationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    console.log("show", show);
    console.log("paymentInfo", paymentInfo);
    if (show && paymentInfo.payId) {
      fetchAllocationDetails();
    }
  }, [show, paymentInfo?.payId]);

  const fetchAllocationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${ServerIP}/auth/view-allocation`, {
        params: { payId: paymentInfo.payId },
      });

      console.log("response", response.data);

      if (response.data.Status) {
        setAllocationData(response.data.paymentAllocation);
      } else {
        setError(response.data.Error || "Failed to fetch allocation details");
      }
    } catch (error) {
      console.error("Error fetching allocation details:", error);
      setError("Failed to fetch allocation details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllocation = async (orderId) => {
    try {
      setAlert({
        show: true,
        title: "Confirm Delete",
        message: "Are you sure you want to delete this allocation?",
        type: "confirm",
        onConfirm: async () => {
          // Close the confirmation window
          setAlert(null);

          const response = await axios.post(
            `${ServerIP}/auth/delete-temp-allocation`,
            {
              payId: paymentInfo.payId,
              orderId: orderId,
            }
          );

          if (response.data.Status) {
            // Update parent component state
            const newOrderPayments = { ...orderPayments };
            delete newOrderPayments[orderId];
            setOrderPayments(newOrderPayments);

            // Update checkPay set using the prop
            setCheckPay((prevCheckPay) => {
              const newCheckPay = new Set(prevCheckPay);
              newCheckPay.delete(orderId);
              return newCheckPay;
            });

            // Update allocation count and amounts
            setAllocationCount(response.data.Result.count);
            setAllocatedAmount(response.data.Result.totalAllocated);
            setRemainingAmount(
              paymentInfo.amount - response.data.Result.totalAllocated
            );

            // Fetch updated allocation data
            const allocationResponse = await axios.get(
              `${ServerIP}/auth/view-allocation`,
              {
                params: { payId: paymentInfo.payId },
              }
            );

            console.log("allocation response", allocationResponse.data);
            if (allocationResponse.data.Status) {
              // Update the modal's allocation data
              setAllocationData(allocationResponse.data.paymentAllocation);
              console.log(
                "New allocation data",
                allocationResponse.data.paymentAllocation
              );
            }

            // Refresh orders to update the UI
            await fetchOrderData();
          }
        },
      });
    } catch (error) {
      console.error("Error deleting allocation:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to delete allocation",
        type: "error",
      });
    }
  };

  // const handlePostPayment = async () => {
  //   try {
  //     const response = await axios.post(`${ServerIP}/auth/post-temp-payment`, {
  //       payId: paymentInfo.payId,
  //     });

  //     if (response.data.Status) {
  //       onPostPayment(response.data.Result);
  //       onClose();
  //     } else {
  //       setError(response.data.Error || "Failed to post payment");
  //     }
  //   } catch (error) {
  //     console.error("Error posting payment:", error);
  //     setError("Failed to post payment");
  //   }
  // };

  const handleCancelPayment = async () => {
    try {
      const response = await axios.post(
        `${ServerIP}/auth/cancel-temp-payment`,
        {
          payId: paymentInfo.payId,
        }
      );

      if (response.data.Status) {
        // Reset state before calling onCancelPayment
        setAllocationData(null);
        setError(null);
        onCancelPayment();
        onClose();
        setAllocationCount(0);
      } else {
        setError(response.data.Error || "Failed to cancel payment");
      }
    } catch (error) {
      console.error("Error cancelling payment:", error);
      setError("Failed to cancel payment");
    }
  };

  // Add cleanup effect
  useEffect(() => {
    if (!show) {
      // Reset state when modal is closed
      setAllocationData(null);
      setError(null);
    }
  }, [show]);

  if (loading) {
    return (
      <Modal show={show} onClose={onClose} title="Payment Allocation">
        <div className="text-center">Loading...</div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal show={show} onClose={onClose} title="Payment Allocation">
        <div className="text-danger">{error}</div>
      </Modal>
    );
  }

  const totalAllocated =
    allocationData?.allocations.reduce(
      (sum, allocation) => sum + allocation.amountApplied,
      0
    ) || 0;

  const remainingAmount = (allocationData?.totalPayment || 0) - totalAllocated;

  return (
    <Modal show={show} onClose={onClose} title="Payment Allocation" size="lg">
      <div className="payment-allocation">
        <div className="payment-info mb-4">
          <div className="row">
            <div className="col-md-6">
              <p>
                <strong>Payment Date:</strong> {allocationData?.payDate}
              </p>
              <p>
                <strong>Payment Type:</strong> {allocationData?.payType}
              </p>
              <p>
                <strong>Reference:</strong> {allocationData?.payReference}
              </p>
              <p>
                <strong>OR#:</strong> {allocationData?.ornum}
              </p>
            </div>
            <div className="col-md-6">
              <p>
                <strong>Total Payment:</strong>{" "}
                {formatPeso(allocationData?.totalPayment || 0)}
              </p>
              <p>
                <strong>Total Allocated:</strong> {formatPeso(totalAllocated)}
              </p>
              <p>
                <strong>Remaining:</strong> {formatPeso(remainingAmount)}
              </p>
              <p>
                <strong>Client:</strong> {allocationData?.clientName}
              </p>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th className="text-center">Order ID</th>
                <th className="text-center">Project Name</th>
                <th className="text-center">Client</th>
                <th className="text-center">Customer</th>
                <th className="text-center">Order Total</th>
                <th className="text-center">Paid</th>
                <th className="text-center">Amount Applied</th>
                <th className="text-center">Balance</th>
                {/* <th className="text-center">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {allocationData?.allocations.map((allocation) => (
                <tr key={allocation.orderId}>
                  <td>{allocation.orderId}</td>
                  <td>{allocation.projectName}</td>
                  <td>{allocation.clientName}</td>
                  <td>{allocation.customerName}</td>
                  <td className="text-right">
                    {formatPeso(allocation.orderTotal)}
                  </td>
                  <td className="text-right">
                    {formatPeso(allocation.orderAmountPaid)}
                  </td>
                  <td className="text-right">
                    {formatPeso(allocation.amountApplied)}{" "}
                    <Button
                      variant="delete"
                      size="sm"
                      iconOnly
                      onClick={() => handleDeleteAllocation(allocation.orderId)}
                    >
                      Delete
                    </Button>
                  </td>
                  <td className="text-right">
                    {formatPeso(
                      allocation.orderTotal -
                        allocation.orderAmountPaid -
                        allocation.amountApplied
                    )}
                  </td>
                </tr>
              ))}
              <tr className="table-info">
                <td colSpan="6" className="text-right">
                  <strong>Totals:</strong>
                </td>
                <td className="text-right">
                  <strong>{formatPeso(totalAllocated)}</strong>
                </td>
                <td className="text-right">
                  <strong>{formatPeso(remainingAmount)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button variant="cancel" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button
            variant="delete"
            onClick={handleCancelPayment}
            disabled={loading}
          >
            Delete Payment
          </Button>
          {/* <Button
            variant="save"
            onClick={handlePostPayment}
            disabled={loading || remainingAmount > 0}
          >
            Post Payment
          </Button> */}
        </div>
      </div>
      <ModalAlert
        show={alert?.show}
        title={alert?.title}
        message={alert?.message}
        type={alert?.type}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
      />
    </Modal>
  );
};

export default PaymentAllocationModal;
