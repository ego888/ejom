import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";
import { QRCodeSVG } from "qrcode.react";
import ModalAlert from "./UI/ModalAlert";

function ProdPrintDR() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [ordersWithDR, setOrdersWithDR] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: "", title: "" });

  // Fetch orders and assign DR numbers
  useEffect(() => {
    const fetchOrdersAndAssignDR = async () => {
      try {
        console.log("Starting to fetch DR data...");
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // 1. Get last DR number
        console.log("Fetching last DR number...");
        const lastDrResponse = await axios.get(
          `${ServerIP}/auth/jomcontrol/lastDR`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Last DR Response:", lastDrResponse.data);
        if (!lastDrResponse.data.Status) {
          throw new Error(
            lastDrResponse.data.Error || "Failed to fetch last DR number"
          );
        }

        let currentDrNumber = parseInt(lastDrResponse.data.Result.lastDrNumber);
        console.log("Current DR Number:", currentDrNumber);

        // 2. Get orders without DR
        console.log("Fetching orders...");
        const ordersResponse = await axios.get(
          `${ServerIP}/auth/orders-all-DR`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Orders Response:", ordersResponse.data);
        if (!ordersResponse.data.Status) {
          throw new Error(
            ordersResponse.data.Error || "Failed to fetch DR data"
          );
        }

        const orders = ordersResponse.data.Result;
        console.log("Orders fetched:", orders?.length || 0);

        if (!orders || orders.length === 0) {
          console.log("No orders found");
          navigate("/dashboard/prod");
          return;
        }

        // 3. Assign DR numbers to orders
        console.log("Assigning DR numbers...");
        const ordersWithAssignedDR = orders.map((order) => {
          currentDrNumber++;
          return {
            ...order,
            drnum: currentDrNumber,
          };
        });

        console.log("Orders with DR numbers:", ordersWithAssignedDR);

        // Store orders with DR numbers for later update
        const drUpdateData = ordersWithAssignedDR.map((order) => ({
          orderID: order.id,
          drnum: order.drnum,
        }));
        console.log("DR Update Data:", drUpdateData);

        setOrdersWithDR(drUpdateData);
        setData(ordersWithAssignedDR);
        setLoading(false);
      } catch (err) {
        console.error("Error in fetchOrdersAndAssignDR:", err);
        handleApiError(err, navigate);
        setAlert({
          show: true,
          title: "Error",
          message: err.message || "Failed to fetch DR data",
          type: "alert",
        });
        navigate("/dashboard/prod");
      }
    };

    fetchOrdersAndAssignDR();
  }, [navigate]);

  // Handle printing when everything is loaded
  useEffect(() => {
    let printTimer;

    if (!loading && data) {
      const handleAfterPrint = () => {
        window.removeEventListener("afterprint", handleAfterPrint);
        setShowConfirmation(true);
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
      window.removeEventListener("afterprint", () => {});
    };
  }, [loading, data]);

  const handleConfirmPrint = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update_orders_drnum`,
        ordersWithDR,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.Status) {
        throw new Error(response.data.Error || "Failed to update DR numbers");
      }

      setAlert({
        show: true,
        title: "Success",
        message: "DR numbers have been successfully updated",
        type: "alert",
      });
    } catch (err) {
      setAlert({
        show: true,
        title: "Error",
        message: err.message || "Failed to update DR numbers",
        type: "alert",
      });
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div>Loading DR data...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="text-center">No orders to print</div>
      </div>
    );
  }

  return (
    <>
      <div className="dr-pages">
        {data.map((order, index) => (
          <div
            key={order.id}
            className={`dr-page ${index < data.length - 1 ? "page-break" : ""}`}
          >
            <div className="title">DELIVERY RECEIPT</div>
            <div className="qr-code">
              <QRCodeSVG value={order.id.toString()} size={100} />
            </div>
            <div className="info-section">
              <div className="info-row">
                <div className="info-label text-center">DR No.:</div>
                <div className="info-value">{order.drnum}</div>
              </div>
              <div className="info-row">
                <div className="info-label text-center">Date:</div>
                <div className="info-value">
                  {new Date().toLocaleDateString("en-US")}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label text-center">Client:</div>
                <div className="info-value">{order.clientName}</div>
              </div>
              <div className="info-row">
                <div className="info-label text-center">Project Name:</div>
                <div className="info-value">{order.projectName}</div>
              </div>
            </div>
            <table className="dr-table">
              <thead>
                <tr>
                  <th className="text-center">Qty</th>
                  <th className="text-center">Size</th>
                  <th className="text-center">Material - Description</th>
                </tr>
              </thead>
              <tbody>
                {order.order_details.map((detail, idx) => (
                  <tr key={idx}>
                    <td className="text-center">
                      {detail.quantity && detail.quantity !== 0
                        ? detail.quantity
                        : ""}
                    </td>
                    <td className="text-center">
                      {detail.width || detail.height
                        ? `${detail.width || ""} ${
                            detail.height ? "x " + detail.height : ""
                          } ${detail.unit || ""}`
                        : ""}
                    </td>
                    <td>{`${detail.material}${
                      detail.itemDescription
                        ? " - " + detail.itemDescription
                        : ""
                    }`}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bottom-section">
              <div className="delivery-instructions">
                <div className="delivery-label">Delivery Instructions:</div>
                <div className="info-value">{order.deliveryInst || ""}</div>
              </div>
              <div className="signature-section">
                <div className="signature-block">
                  <div className="signature-line">Received by / Date</div>
                </div>
              </div>
            </div>

            <div className="page-footer">
              <div className="jo-number">JO: {order.id}</div>
              <div className="page-number">
                Page {index + 1} of {data.length}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>
        {`
          @media print {
            @page {
              size: A5 landscape;
              margin: 0.25in;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-break {
              page-break-after: always;
            }
          }

          .dr-page {
            width: 8.3in;
            height: 5.6in;
            padding: 0.5in;
            position: relative;
            font-family: Arial, sans-serif;
            font-size: 12px;
            page-break-after: always;
          }

          .dr-page:last-child {
            page-break-after: auto;
          }

          .title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
          }

          .qr-code {
            position: absolute;
            top: 0.5in;
            right: 0.5in;
          }

          .info-section {
          }

          .info-row {
            display: flex;
            margin-bottom: 2px;
            font-size: 12px;
          }

          .info-label {
            width: 120px;
            font-weight: bold;
            font-size: 12px;
            padding-right: 2px;
          }

          .info-value {
            flex: 1;
            font-size: 12px;
          }

          .delivery-label {
            font-weight: bold;
            font-size: 12px;
          }

          .delivery-instructions {
            flex: 0 0 65%;
            padding: 5px;
            border: 1px solid rgb(29, 29, 29);
            border-radius: 8px;
            min-height: 60px;
            font-size: 12px;
          }

          .dr-table {
            width: 100%;
            border-collapse: collapse;
          }

          .dr-table th,
          .dr-table td {
            border: 1px solid black;
            padding: 4px;
          }

          .dr-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }

          .text-center {
            text-align: center;
          }

          .bottom-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 5px;
            gap: 20px;
            position: relative;
          }

          .signature-section {
            flex: 0 0 30%;
            margin-top: 10px;
          }

          .signature-block {
            width: 100%;
          }

          .signature-line {
            border-top: 1px solid black;
            padding-top: 5px;
            text-align: center;
          }

          .page-footer {
            position: absolute;
            bottom: 0.25in;
            left: 0.5in;
            right: 0.5in;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
          }

          .jo-number {
            font-weight: bold;
          }
        `}
      </style>

      <ModalAlert
        show={showConfirmation}
        title="Print Confirmation"
        message="Was the DR printing successful? Click OK to update DR numbers into Order records."
        type="confirm"
        onConfirm={handleConfirmPrint}
        onClose={() => navigate("/dashboard/prod")}
      />

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type="alert"
        onClose={() => {
          setAlert({ show: false });
          navigate("/dashboard/prod");
        }}
      />
    </>
  );
}

export default ProdPrintDR;
