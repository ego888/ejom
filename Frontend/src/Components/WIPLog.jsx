import React, { useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";
import "./WIPLog.css";

function WIPLog() {
  const [finishedOrderId, setFinishedOrderId] = useState("");
  const [deliverOrderId, setDeliverOrderId] = useState("");
  const [billedOrderId, setBilledOrderId] = useState("");
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

      console.log(response.data.Status);
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
        } else if (newStatus === "Billed") {
          setBilledOrderId("");
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

  const handleBilledSubmit = (e) => {
    e.preventDefault();
    if (billedOrderId) {
      handleStatusUpdate(billedOrderId, "Billed");
    }
  };

  return (
    <div className="wiplog-container p-4">
      <h2 className="mb-4">WIP Log</h2>

      <div className="row g-4">
        <div className="col-md-12">
          <div className="card status-badge Finished">
            <div className="card-body">
              <h5 className="card-title">Mark as Finished</h5>
              <form onSubmit={handleFinishedSubmit}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter JO #"
                    value={finishedOrderId}
                    onChange={(e) => setFinishedOrderId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleFinishedSubmit(e);
                      }
                    }}
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

        <div className="col-md-12">
          <div className="card status-badge Delivered">
            <div className="card-body">
              <h5 className="card-title">Mark as Delivered</h5>
              <form onSubmit={handleDeliverSubmit}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter JO #"
                    value={deliverOrderId}
                    onChange={(e) => setDeliverOrderId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleDeliverSubmit(e);
                      }
                    }}
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

        <div className="col-md-12">
          <div className="card status-badge Billed">
            <div className="card-body">
              <h5 className="card-title">Mark as Billed</h5>
              <form onSubmit={handleBilledSubmit}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter JO #"
                    value={billedOrderId}
                    onChange={(e) => setBilledOrderId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBilledSubmit(e);
                      }
                    }}
                    autoComplete="off"
                  />
                  <button className="btn btn-primary" type="submit">
                    Billed
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
