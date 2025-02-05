import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";

function ProdPrintProduction() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch production orders
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`${ServerIP}/auth/orders-details-forprod`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        if (!response.data.Status) {
          throw new Error(response.data.Error || "Failed to fetch print data");
        }

        const orders = response.data.Result;
        if (orders.length === 0) {
          navigate("/dashboard/prod");
          return;
        }

        setData(orders);
        setLoading(false);
      })
      .catch((err) => {
        handleApiError(err, navigate);
        navigate("/dashboard/prod");
      });
  }, [navigate]);

  // Handle printing when everything is loaded
  useEffect(() => {
    let printTimer;
    let navigationTimer;

    if (!loading && data) {
      const handleAfterPrint = () => {
        window.removeEventListener("afterprint", handleAfterPrint);
        if (navigationTimer) clearTimeout(navigationTimer);
        navigationTimer = setTimeout(() => {
          navigate("/dashboard/prod");
        }, 100);
      };

      if (printTimer) clearTimeout(printTimer);
      window.removeEventListener("afterprint", handleAfterPrint);
      window.addEventListener("afterprint", handleAfterPrint);

      printTimer = setTimeout(() => {
        window.print();
      }, 100);
    }

    return () => {
      if (printTimer) clearTimeout(printTimer);
      if (navigationTimer) clearTimeout(navigationTimer);
      window.removeEventListener("afterprint", () => {});
    };
  }, [loading, data, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>No orders to print</div>;
  }

  const totalQuantity = data.reduce(
    (sum, order) => sum + (order.quantity || 0),
    0
  );

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center my-3">
        <div style={{ width: "150px" }}></div>
        <div className="fw-bold fs-5 text-center">PRODUCTION ORDER LIST</div>
        <div style={{ width: "150px", textAlign: "right" }}>
          {new Date().toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
          })}{" "}
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>
      </div>

      <table className="prod-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Client</th>
            <th>Project Name</th>
            <th>Due Date & Time</th>
            <th className="text-center">Quantity</th>
            <th className="text-center">Width</th>
            <th className="text-center">Height</th>
            <th className="text-center">Print Hrs</th>
            <th className="text-center">Square Feet</th>
          </tr>
        </thead>
        <tbody>
          {data.map((order, index, array) => {
            const prevOrder = index > 0 ? array[index - 1] : null;
            const isSameOrder = prevOrder && prevOrder.id === order.id;

            return (
              <tr
                key={`${order.id}-${index}`}
                className={index % 2 === 0 ? "row-even" : "row-odd"}
              >
                <td>{!isSameOrder ? order.id || "" : ""}</td>
                <td>{!isSameOrder ? order.clientName || "" : ""}</td>
                <td>{!isSameOrder ? order.projectName || "" : ""}</td>
                <td>
                  {!isSameOrder
                    ? `${
                        order.dueDate
                          ? new Date(order.dueDate).toLocaleDateString("en-US")
                          : ""
                      } ${order.dueTime || ""}`
                    : ""}
                </td>
                <td className="text-center">{order.quantity || ""}</td>
                <td className="text-center">{order.width || ""}</td>
                <td className="text-center">{order.height || ""}</td>
                <td className="text-center">{order.printHrs || ""}</td>
                <td className="text-center">{order.squareFeet || ""}</td>
              </tr>
            );
          })}
          <tr className="total-row">
            <td colSpan="4" className="text-end fw-bold">
              Total:
            </td>
            <td className="text-center fw-bold">{totalQuantity}</td>
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>

      <style>
        {`
          @media print {
            @page {
              size: letter;
              margin: 0.5in;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .table {
              border-collapse: collapse;
              --bs-table-bg: transparent !important;
            }
            .table th,
            .table td {
              border: none !important;
            }
            .table th {
              border-bottom: 2px solid #000 !important;
              background-color: white !important;
              font-weight: bold;
            }
            .row-even {
              background-color: rgb(211, 211, 211) !important;
            }
            .row-odd {
              background-color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .total-row {
              border-top: 2px solid #000 !important;
              background-color: white !important;
            }
          }
          /* Non-print styles */
          .table {
            border-collapse: collapse;
          }
          .table th,
          .table td {
            border: none;
          }
          .table th {
            border-bottom: 2px solid #000;
            background-color: white;
            font-weight: bold;
          }

          .total-row {
            border-top: 2px solid #000;
            background-color: white;
          }
        `}
      </style>
    </div>
  );
}

export default ProdPrintProduction;
