import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";
import { QRCodeSVG } from "qrcode.react";

function ProdPrintDR() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch orders without DR
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`${ServerIP}/auth/orders-all-DR`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        if (!response.data.Status) {
          throw new Error(response.data.Error || "Failed to fetch DR data");
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
              <div className="info-value">{order.id}</div>
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
                    detail.itemDescription ? " - " + detail.itemDescription : ""
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

          <div className="page-number">
            Page {index + 1} of {data.length}
          </div>
        </div>
      ))}

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
          }

          .info-label {
            width: 120px;
            font-weight: bold;
          }

          .delivery-label {
            font-weight: bold;
          }
          .info-value {
            flex: 1;
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

          .delivery-instructions {
            flex: 0 0 65%;
            padding: 5px;
            border: 1px solid rgb(29, 29, 29);
            border-radius: 8px;
            min-height: 60px;
          }

          .delivery-instructions .info-label {
            margin-bottom: 5px;
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

          .page-number {
            position: absolute;
            bottom: 0.25in;
            right: 0.5in;
            font-size: 10px;
          }
        `}
      </style>
    </div>
  );
}

export default ProdPrintDR;
