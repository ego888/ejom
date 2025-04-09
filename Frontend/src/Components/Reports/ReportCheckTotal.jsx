import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatPeso, formatNumber } from "../../utils/orderUtils";
import { handleApiError } from "../../utils/handleApiError";
import { useNavigate } from "react-router-dom";
import ModalAlert from "../UI/ModalAlert";
import { ServerIP } from "../../config";

function ReportCheckTotal() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ServerIP}/auth/check-order-total`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.Status) {
        setData(response.data.Result);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error,
          type: "alert",
        });
      }
    } catch (error) {
      handleApiError(error, navigate, (title, message, type) => {
        setAlert({
          show: true,
          title,
          message,
          type,
        });
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (orderId, event) => {
    if (event.button === 2) {
      // Right click
      window.open(`/dashboard/orders/edit/${orderId}`, "_blank");
    } else {
      navigate(`/dashboard/orders/edit/${orderId}`);
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
  };

  if (loading) {
    return (
      <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Order Total Discrepancies</h3>
      </div>

      {data.length > 0 && (
        <div className="mt-3" style={{ maxWidth: "350px", margin: "0 auto" }}>
          <table className="table table-striped justify-content-center">
            <thead>
              <tr>
                <th className="text-center">Order ID</th>
                <th className="text-center">Status</th>
                <th className="text-center">Paid</th>
                <th className="text-center">Total in Orders</th>
                <th className="text-center">Total in Details</th>
                <th className="text-center">Difference</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td className="text-center">
                    <button
                      className="btn btn-link p-0"
                      onClick={(e) => handleOrderClick(item.order_id, e)}
                      onContextMenu={handleContextMenu}
                      onMouseDown={(e) => handleOrderClick(item.order_id, e)}
                      style={{ textDecoration: "none" }}
                    >
                      {item.order_id}
                    </button>
                  </td>
                  <td className="text-center">
                    <span className={`status-badge ${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end">{formatNumber(item.amountPaid)}</td>
                  <td className="text-end">
                    {formatNumber(item.total_in_orders)}
                  </td>
                  <td className="text-end">
                    {formatNumber(item.total_in_details)}
                  </td>
                  <td className="text-end">
                    {formatNumber(item.total_in_orders - item.total_in_details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center mt-3">
          <p>No discrepancies found</p>
        </div>
      )}

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
}

export default ReportCheckTotal;
