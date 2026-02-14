import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig"; // Import configured axios
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";
import { formatDate } from "../utils/orderUtils";

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
        <div className="fw-bold text-center" style={{ fontSize: "18px" }}>
          PRODUCTION ORDER LIST
        </div>
        <div style={{ width: "150px", textAlign: "right", fontSize: "12px" }}>
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
          <tr className="header-row">
            <th>JO #</th>
            <th>Client</th>
            <th style={{ maxWidth: "200px" }}>Project Name</th>
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
                <td
                  style={{
                    maxWidth: "200px",
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                  }}
                >
                  {!isSameOrder ? order.projectName || "" : ""}
                </td>
                <td>
                  {!isSameOrder
                    ? `${
                        order.dueDate ? formatDate(order.dueDate) : ""
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
          {/* <tr className="total-row">
            <td colSpan="5" className="text-center fw-bold">
              <div>Total:</div>
              <div>{totalQuantity}</div>
            </td>
          </tr> */}
        </tbody>
      </table>
      <div className="total-row-container">
        <div className="total-label">Total:</div>
        <div className="total-quantity">{totalQuantity}</div>
      </div>

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
            .prod-table {
              border-collapse: collapse;
              width: 100%;
              font-size: 14px;
              font-family: "Times New Roman", Times, serif;
            }
            .prod-table th,
            .prod-table td {
              border: none !important;
              padding: 6px 6px;
            }
            .prod-table th {
              background-color: white !important;
              font-weight: bold;
            }
            .row-even {
              background-color: rgb(230, 230, 230) !important;
            }
            .row-odd {
              background-color: white !important;
            }
            .header-row {
              border-top: 2px solid #000 !important;
              border-bottom: 2px solid #000 !important;
              background-color: white !important;
              font-weight: bold;
            }
          }
          /* Non-print styles */
          .prod-table {
            border-collapse: collapse;
            width: 100%;
            font-size: 14px;
          }
          .prod-table th,
          .prod-table td {
            border: none;
            padding: 4px 6px;
          }
          .prod-table th {
            border-bottom: 2px solid #000;
            background-color: white;
            font-weight: bold;
          }
          .row-even {
            background-color: rgb(211, 211, 211);
          }
          .row-odd {
            background-color: white;
          }
          .total-row {
            border-top: 2px solid #000;
            background-color: white;
          }
          .total-row td {
            padding: 8px 6px;
          }
          .total-row-container {
            display: flex;
            justify-content: flex-end; /* Align to the right */
            padding: 10px;
            font-weight: bold;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            background-color: white;
            width: 100%;
          }
          .total-label {
            margin-right: 10px;
          }
          .total-quantity {
            min-width: 50px;
            text-align: center;
            margin-right: 240px;
          }
        `}
      </style>
    </div>
  );
}

export default ProdPrintProduction;
