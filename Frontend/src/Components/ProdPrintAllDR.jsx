// import React from "react";
// import ReactDOMServer from "react-dom/server";
// import axios from "axios";
// import { ServerIP } from "../config";
// import { handleApiError } from "../utils/handleApiError";
// import { useNavigate } from "react-router-dom";
// import { QRCodeSVG } from "qrcode.react";
export const handlePrintAllDR = async (selectedOrders, navigate) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${ServerIP}/auth/print_all_dr`,
      { orderIds: selectedOrders },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.Status) {
      throw new Error(response.data.Error || "Failed to fetch DR data");
    }

    const orders = response.data.Result;

    // Create print window content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Receipt</title>
          <style>
            @media print {
              @page {
                size: letter;
                margin: 0.5in;
              }
              .page-break {
                page-break-after: always;
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 12px;
            }
            .dr-page {
              height: 10in;
              position: relative;
              padding: 0.5in;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .contact {
              font-weight: bold;
              margin: 5px 0;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .info-section {
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              width: 120px;
              font-weight: bold;
            }
            .info-value {
              flex: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid black;
              padding: 5px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
            }
            .signature-section {
              margin-top: 40px;
            }
            .signature-line {
              margin-top: 40px;
              border-top: 1px solid black;
              width: 200px;
              text-align: center;
            }
            .qr-code {
              position: absolute;
              top: 0.5in;
              right: 0.5in;
              width: 100px;
              height: 100px;
            }
          </style>
        </head>
        <body>
          ${orders
            .map(
              (order, index) => `
            <div class="dr-page ${
              index < orders.length - 1 ? "page-break" : ""
            }">
              <img 
                src="${ServerIP}/Images/Go Large logo 2009C2 small.jpg" 
                alt="Go Large Logo" 
                style="max-width: 150px; display: block; margin: 0 auto;" 
                onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div style=\\'text-align:center; font-weight:bold;\\'>Go Large Logo</div>');"
              />
              <div class="header">
                <div class="contact">GO LARGE GRAPHICS, INC.</div>
                <div class="contact">TEL. # 416-8882</div>
              </div>
              <div class="title">DELIVERY RECEIPT</div>
              <div class="qr-code">
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
                  ${ReactDOMServer.renderToStaticMarkup(
                    <QRCodeSVG value={order.id.toString()} size={100} />
                  )}
                </svg>
              </div>
              <div class="info-section">
                <div class="info-row">
                  <div class="info-label">DR No.:</div>
                  <div class="info-value">${order.id}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Date:</div>
                  <div class="info-value">${new Date().toLocaleDateString(
                    "en-US"
                  )}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Client:</div>
                  <div class="info-value">${order.clientName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Project Name:</div>
                  <div class="info-value">${order.projectName}</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Quantity</th>
                    <th>Size</th>
                    <th>Material - Description</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-center">
                      ${
                        order.quantity && order.quantity !== 0
                          ? order.quantity
                          : ""
                      }
                    </td>
                    <td className="text-center">
                      ${
                        order.width || order.height
                          ? `${order.width || ""} ${
                              order.height ? "x " + order.height : ""
                            } ${order.unit || ""}`
                          : ""
                      }
                    </td>
                    <td>
                      {detail.material}
                      ${order.description || ""}
                    </td>
                    <td className="text-end">
                      ${order.unitPrice !== 0 ? order.unitPrice : ""}
                    </td>
                    ${order.discount !== 0 ? order.discount : ""}
                    <td className="text-end">
                      ${order.amount !== 0 ? order.amount : ""}
                    </td>
                </tbody>
              </table>
              <div class="signature-section">
                <div style="float: left">
                  <div class="signature-line">Received by / Date</div>
                </div>
                <div style="float: right">
                  <div class="signature-line">Authorized Signature</div>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Wait for images to load before printing
      printWindow.onload = function () {
        printWindow.print();
        printWindow.onafterprint = function () {
          printWindow.close();
        };
      };
    }

    return true;
  } catch (err) {
    handleApiError(err, navigate);
    return false;
  }
};

const ProdPrintAllDR = ({ selectedOrders }) => {
  const navigate = useNavigate();

  const handlePrint = async () => {
    await handlePrintAllDR(selectedOrders, navigate);
  };

  return null; // This is a utility component, no UI needed
};

export default ProdPrintAllDR;
