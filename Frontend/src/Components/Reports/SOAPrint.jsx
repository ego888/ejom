import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import GoLargeLogo from "../../assets/Go Large logo 2009C2 small.jpg";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./SOAPrint.css";

function SOAPrint() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [soaData, setSOAData] = useState(null);
  const [client, setClient] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.src = GoLargeLogo;
    img.onload = () => setLogoLoaded(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [soaResponse, companyResponse] = await Promise.all([
          axios.get(`${ServerIP}/auth/soa-details`, {
            params: { clientId, category: "total" },
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${ServerIP}/auth/jomcontrol`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (soaResponse.data.Status) {
          setSOAData(soaResponse.data.Result);

          // Get client info
          const clientResponse = await axios.get(
            `${ServerIP}/auth/client/${clientId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (clientResponse.data.Status) {
            setClient(clientResponse.data.Result);
          }
        }

        if (companyResponse.data.Status) {
          setCompanyInfo(companyResponse.data.Result);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  useEffect(() => {
    if (!loading && soaData && logoLoaded) {
      // Print after a short delay to ensure rendering
      const printTimer = setTimeout(() => {
        window.print();
      }, 100);

      // Handle print completion
      const handlePrintEvent = () => {
        setTimeout(() => {
          window.close();
        }, 100);
      };

      window.addEventListener("afterprint", handlePrintEvent);

      return () => {
        clearTimeout(printTimer);
        window.removeEventListener("afterprint", handlePrintEvent);
      };
    }
  }, [loading, soaData, logoLoaded]);

  if (loading || !soaData || !client || !companyInfo || !logoLoaded) {
    return <div>Loading...</div>;
  }

  const total = soaData.reduce(
    (sum, item) => sum + (item.grandTotal - item.amountPaid),
    0
  );

  return (
    <div className="print-quote-page">
      <div className="print-quote-container">
        {/* Header */}
        <div className="header-section">
          <div className="header-left">
            <img src={GoLargeLogo} alt="Company Logo" className="logo" />
          </div>
          <div className="header-right">
            <p>{companyInfo?.companyAddress1}</p>
            <p>{companyInfo?.companyAddress2}</p>
            <p>Tel: {companyInfo?.companyPhone}</p>
            <p>Email: {companyInfo?.companyEmail}</p>
          </div>
        </div>

        <hr className="divider" />
        <div className="quote-title">
          <h1>STATEMENT OF ACCOUNT</h1>
        </div>
        <hr className="divider" />

        {/* Client Info */}
        <div className="quote-info">
          <div className="info-row">
            <div className="info-item">
              <span id="client-label" className="label">
                Client:
              </span>
              <span aria-labelledby="client-label" className="value">
                {client.clientName}
              </span>
            </div>
            <div className="info-item">
              <span id="date-label" className="label">
                Date:
              </span>
              <span aria-labelledby="date-label" className="value">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* SOA Details Table */}
        <table
          className="quote-details-table"
          aria-label="Statement of Account Details"
        >
          <thead>
            <tr>
              <th>Date</th>
              <th>DR No.</th>
              <th>Invoice</th>
              <th>Cust. Ref.</th>
              <th>Project Name</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Paid</th>
              <th>Date</th>
              <th className="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {soaData.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? "row-gray" : ""}>
                <td>{new Date(item.productionDate).toLocaleDateString()}</td>
                <td>{item.orderId}</td>
                <td>{item.orderReference || ""}</td>
                <td>{item.customerRef || ""}</td>
                <td>{item.projectName}</td>
                <td className="text-right">{formatPeso(item.grandTotal)}</td>
                <td className="text-right">{formatPeso(item.amountPaid)}</td>
                <td>
                  {item.datePaid
                    ? new Date(item.datePaid).toLocaleDateString()
                    : ""}
                </td>
                <td className="text-right">
                  {formatPeso(item.grandTotal - item.amountPaid)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="8" className="text-right fw-bold">
                Total Payable:
              </td>
              <td className="text-right fw-bold">{formatPeso(total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Section */}
        <div className="signature-section mt-4">
          <div className="prepared-by">
            <p>Prepared by:</p>
            <p className="name">{companyInfo?.soaName}</p>
            <p className="note">This SOA is system generated.</p>
            <p className="note">No signature required.</p>
          </div>

          {/* Bank Information */}
          <div className="bank-info mt-1">
            <p className="name">Bank Information:</p>
            <p className="mt-0">{companyInfo.bankInfo}</p>
          </div>

          <div className="received-by">
            <p>Received by:</p>
            <div className="signature-line">
              <p>Printed name, signature & date</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="document-footer">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="print-date">
              <span>Printed: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SOAPrint;
