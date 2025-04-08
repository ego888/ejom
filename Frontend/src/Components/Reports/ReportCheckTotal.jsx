import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatPeso } from "../../utils/orderUtils";
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

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Order Total Discrepancies</h3>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Total in Orders</th>
                      <th>Total in Details</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={index}>
                        <td>{item.order_id}</td>
                        <td className="number_right">
                          {formatPeso(item.total_in_orders)}
                        </td>
                        <td className="number_right">
                          {formatPeso(item.total_in_details)}
                        </td>
                        <td className="number_right">
                          {formatPeso(
                            item.total_in_orders - item.total_in_details
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center">
                          No discrepancies found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

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
