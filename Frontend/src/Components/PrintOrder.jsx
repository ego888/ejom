import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig"; // Import configured axios
import { ServerIP } from "../config";
import { handleApiError } from "../utils/handleApiError";
import GoLargeLogo from "../assets/Go Large logo 2009C2 small.jpg";
import { QRCodeSVG } from "qrcode.react";

function PrintOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.src = GoLargeLogo;
    img.onload = () => setLogoLoaded(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch order data, details, and employees in parallel
    Promise.all([
      axios.get(`${ServerIP}/auth/order/${id}`, config),
      axios.get(`${ServerIP}/auth/order_details/${id}`, config),
    ])
      .then(([orderRes, detailsRes]) => {
        if (orderRes.data.Status) {
          setData(orderRes.data.Result);
          setOrderDetails(detailsRes.data.Result);
        }
        setLoading(false);
      })
      .catch((err) => handleApiError(err));
  }, [id]);

  // Calculate current page based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!loading && data) {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;

        // Calculate which page we're on based on scroll position
        const currentPageNum = Math.floor(scrollPosition / windowHeight) + 1;

        // Ensure current page is at least 1
        setCurrentPage(Math.max(1, currentPageNum));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, data]);

  // Single effect to handle printing when everything is loaded
  useEffect(() => {
    let printTimer;
    let navigationTimer;

    if (!loading && data && logoLoaded) {
      const handleAfterPrint = () => {
        // Clean up the event listener immediately
        window.removeEventListener("afterprint", handleAfterPrint);

        // Clear any existing timers
        if (navigationTimer) clearTimeout(navigationTimer);

        // Set new navigation timer
        navigationTimer = setTimeout(() => {
          navigate(`/dashboard/orders/edit/${id}`);
        }, 100);
      };

      // Clear any existing print timers
      if (printTimer) clearTimeout(printTimer);

      // Add the event listener
      window.removeEventListener("afterprint", handleAfterPrint); // Remove any existing listener
      window.addEventListener("afterprint", handleAfterPrint);

      // Set new print timer
      printTimer = setTimeout(() => {
        window.print();
      }, 100);
    }

    // Cleanup function
    return () => {
      if (printTimer) clearTimeout(printTimer);
      if (navigationTimer) clearTimeout(navigationTimer);
      // Remove any lingering event listeners
      window.removeEventListener("afterprint", () => {});
    };
  }, [loading, data, logoLoaded, id, navigate]);

  const renderAllowances = (detail) => {
    const allowances = [];
    if (detail.top > 0) allowances.push(`T:${detail.top}`);
    if (detail.bottom > 0) allowances.push(`B:${detail.bottom}`);
    if (detail.allowanceLeft > 0) allowances.push(`L:${detail.allowanceLeft}`);
    if (detail.allowanceRight > 0)
      allowances.push(`R:${detail.allowanceRight}`);

    return allowances.length > 0 ? allowances.join(" ") : "";
  };

  const hasAllowancesOrRemarks = (detail) => {
    const allowances = renderAllowances(detail);
    return (
      allowances !== "" || (detail.remarks && detail.remarks.trim() !== "")
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Order not found</div>;
  }

  return (
    <div className="p-3">
      {/* Header Section */}
      <div className="header-box mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          {/* Left-aligned: Job Order */}
          <h3 className="m-0 text-start">
            Job Order #{data.orderId || ""}
            {data.revision !== 0 && (
              <span className="text-muted ms-2">Rev.{data.revision}</span>
            )}
          </h3>

          {/* Centered: Logo */}
          <div className="flex-grow-1 d-flex justify-content-center">
            <img
              src={GoLargeLogo}
              alt="Go Large Logo"
              className="header-logo"
              onLoad={() => setLogoLoaded(true)}
            />
          </div>

          {/* Right-aligned: QR Code */}
          <div className="qr-code">
            <QRCodeSVG value={data.orderId.toString()} size={40} />
          </div>
        </div>

        <div className="header-grid">
          <div className="header-item">
            <span className="label">Client:</span>{" "}
            <span className="field-value">
              <strong>{data.clientName || ""}</strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label vertical-center">
              {data.customerName || ""}
            </span>
          </div>
          <div className="header-item">
            <span className="label">Project:</span>{" "}
            <span className="field-value">
              <strong>{data.projectName || ""}</strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label">Ordered By:</span>{" "}
            <span className="lable">
              <strong>{data.orderedBy || ""}</strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label">Order Reference:</span>{" "}
            <span className="label">
              <strong>{data.orderReference || ""}</strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label">Order Date:</span>{" "}
            <span className="label">
              <strong>{new Date(data.orderDate).toLocaleDateString()}</strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label">Due:</span>{" "}
            <span className="label">
              <strong>
                {data.dueDate || ""} {data.dueTime || ""}
              </strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label">Graphics:</span>{" "}
            <span className="label">
              <strong>{data.graphicsByName || ""}</strong>
            </span>
          </div>
          <div className="header-item">
            <span className="label">Prepared By:</span>{" "}
            <span className="label">
              <strong>{data.preparedByName || ""}</strong>
            </span>
          </div>
        </div>
        <div className="instructions-grid mt-2">
          {data.specialInst && (
            <div className="instruction-item d-flex justify-content-between">
              <div>
                <span className="label">Special Instructions:</span>{" "}
                <span className="field-value">
                  <strong>{data.specialInst || ""}</strong>
                </span>
              </div>
              <div className="field-value me-3">
                <strong>{data.sample === 1 && <span>☑ Sample</span>}</strong>
              </div>
            </div>
          )}
          <div className="instruction-item d-flex justify-content-between">
            {data.deliveryInst && (
              <div>
                <span className="label">Delivery Instructions:</span>{" "}
                <span className="field-value">
                  <strong>{data.deliveryInst || ""}</strong>
                </span>
              </div>
            )}
            <div className="field-value me-3">
              <strong>{data.reprint === 1 && <span>☑ Reprint</span>}</strong>
            </div>
          </div>
        </div>
      </div>
      {/* Order Details Table */}
      <div>
        <table className="table table-bordered table-sm">
          <thead>
            <tr>
              <th className="text-center" style={{ width: "8%" }}>
                Qty
              </th>
              <th className="text-center" style={{ width: "8%" }}>
                Width
              </th>
              <th className="text-center" style={{ width: "8%" }}>
                Height
              </th>
              <th className="text-center" style={{ width: "4%" }}>
                Unit
              </th>
              <th className="text-center" style={{ width: "8%" }}>
                Material
              </th>
              <th className="text-center" style={{ width: "8%" }}>
                Hours
              </th>
              <th className="text-center" style={{ width: "56%" }}>
                Filename
              </th>
            </tr>
          </thead>
          <tbody>
            {orderDetails.map((detail, index) => (
              <React.Fragment key={`${detail.orderId}_${detail.displayOrder}`}>
                <tr className="main-row">
                  <td className="text-center field-value">
                    {Number(detail.quantity).toLocaleString()}
                  </td>
                  <td className="text-center field-value">{detail.width}</td>
                  <td className="text-center field-value">{detail.height}</td>
                  <td className="text-center field-value">{detail.unit}</td>
                  <td className="text-center field-value">{detail.material}</td>
                  <td className="text-center label">{detail.printHrs}</td>
                  <td className="label"></td>
                </tr>
                {hasAllowancesOrRemarks(detail) && (
                  <tr className="remarks-row">
                    <td colSpan="3" className="field-value">
                      {renderAllowances(detail)}
                    </td>
                    <td
                      colSpan="4"
                      className="field-value"
                      style={{ whiteSpace: "pre-wrap", fontSize: "10pt" }}
                    >
                      {detail.remarks && `Remarks: ${detail.remarks}`}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Total Hours */}
      <span className="label">Total Hours:</span>{" "}
      <span className="field-value" style={{ marginRight: "15px" }}>
        {data.totalHrs || ""}
      </span>
      {/* Page Info and Print DateTime */}
      <div className="page-info">
        JO#{data.orderId} • {new Date().toLocaleString()} •
      </div>
      {/* Print-specific styles */}
      <style>
        {`
          .header-box {
            border: 1px solid #ddd;
            padding: 6px;
            margin-bottom: 10px;
          }

          .header-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
          }

          .header-item {
            padding: 1px 0;
            border-bottom: 1px solid #ddd;
          }

          .instructions-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 4px;
            margin-top: 4px;
          }

          .instruction-item {
            padding: 1px 0;
            border-bottom: 1px solid #ddd;
          }

          .checkmarks {
            white-space: nowrap;
            margin-left: 20px;
          }

          .label {
            font-weight: normal;
          }

          .field-value {
            font-size: 12pt;
          }

          .page-info {
            font-size: 8pt;
            color: #666;
            position: fixed;
            right: 0.0cm;
            bottom: 0cm;
            writing-mode: vertical-lr;
            transform: rotate(180deg);
            white-space: nowrap;
            text-shadow: -1px -1px 0 #fff,  
                         1px -1px 0 #fff,
                        -1px  1px 0 #fff,
                         1px  1px 0 #fff;
          }

          @media print {
            @page {
              size: A5 landscape;
              margin: 1cm;
            }
            
            body {
              font-size: 9pt;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              counter-reset: page;
            }

            div.p-3 {
              counter-increment: page;
            }
              
            .header-box {
              border: 1px solid #ddd;
              padding: 6px;
              margin-bottom: 8px;
            }

            .table {
              width: 100%;
              border-collapse: collapse !important;
            }

            .table th {
              background-color: #f8f9fa !important;
              font-weight: bold;
              font-size: 9pt;
              border: 1px solid #ddd;
              border-bottom: 2px solid #000 !important;
              padding: 2px 4px;
              vertical-align: middle;
              border-top: 2px solid #000 !important;
            }

            .table td {
              padding: 2px 4px;
              vertical-align: middle;
              border: 1px solid #ddd;
            }

            /* Main row with solid black top border */
            .table tbody tr.main-row td {
              border-top: 2px solid #000 !important;
              border-bottom: 2px solid #000 !important;
            }

            /* Light borders for remarks */
            .table tbody tr.remarks-row td {
              border: 1px solid #ddd;
            }

            .field-value {
              font-size: 12pt;
            }

            /* Compact the layout */
            .mb-3 { margin-bottom: 0.4rem !important; }
            .mt-1 { margin-top: 0.2rem !important; }
            .gap-3 { gap: 0.4rem !important; }
            .p-3 { padding: 0.4rem !important; }

            /* Hide any elements not needed in print */
            button, 
            .no-print {
              display: none !important;
            }

            .page-info {
              font-size: 9pt;
              position: fixed;
              right: 0.0cm;
              bottom: 0cm;
              color: #666;
              writing-mode: vertical-lr;
              transform: rotate(180deg);
              white-space: nowrap;
              background-color: white;
              padding: 0px 0px;
              background-opacity: 0.4;
              text-shadow: -1px -1px 0 #fff,  
                           1px -1px 0 #fff,
                          -1px  1px 0 #fff,
                           1px  1px 0 #fff;
            }

            .page-info::after {
              transform: rotate(180deg);
              content: " Page " counter(page);
            }

            .header-logo {
              max-width: 90px; /* Logo size */
              height: auto; /* Maintain aspect ratio */
              margin-right: 100px; /* Adjust to move the logo left */
            }

            .qr-code {
              margin-right: 0; /* Remove unnecessary margin */
            }

            .checkmarks {
              white-space: nowrap;
              margin-left: 5px;
            }

          }

          /* Screen styles */
          @media screen {
            .table th {
              background-color: #f8f9fa;
            }
          }
        `}
      </style>
    </div>
  );
}

export default PrintOrder;
