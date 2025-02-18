import React, { useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";
import "./WIPLog.css";

function WIPLog() {
  const [finishedOrderId, setFinishedOrderId] = useState("");
  const [deliverOrderId, setDeliverOrderId] = useState("");
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `${ServerIP}/auth/update_order_status`,
        {
          orderId,
          newStatus,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          message: response.data.Message,
          type: "success",
        });

        // Clear the corresponding input
        if (newStatus === "Finished") {
          setFinishedOrderId("");
        } else if (newStatus === "Delivered") {
          setDeliverOrderId("");
        }
      } else {
        setAlert({
          show: true,
          message: response.data.Error,
          type: "error",
        });
      }
    } catch (error) {
      handleApiError(error, setAlert);
    }
  };

  const handleFinishedSubmit = (e) => {
    e.preventDefault();
    if (finishedOrderId) {
      handleStatusUpdate(finishedOrderId, "Finished");
    }
  };

  const handleDeliverSubmit = (e) => {
    e.preventDefault();
    if (deliverOrderId) {
      handleStatusUpdate(deliverOrderId, "Delivered");
    }
  };

  return (
    <div className="wiplog-container p-4">
      <h2 className="mb-4">WIP Log</h2>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Mark as Finished</h5>
              <form onSubmit={handleFinishedSubmit}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Order ID"
                    value={finishedOrderId}
                    onChange={(e) => setFinishedOrderId(e.target.value)}
                    autoComplete="off"
                  />
                  <button className="btn btn-primary" type="submit">
                    Finish
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Mark as Delivered</h5>
              <form onSubmit={handleDeliverSubmit}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Order ID"
                    value={deliverOrderId}
                    onChange={(e) => setDeliverOrderId(e.target.value)}
                    autoComplete="off"
                  />
                  <button className="btn btn-primary" type="submit">
                    Deliver
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type} mt-3`} role="alert">
          {alert.message}
        </div>
      )}
    </div>
  );
}

export default WIPLog;
