import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import GoLargeLogo from "../assets/Go Large logo 2009C2 small.jpg";
import "./PrintQuote.css";

function PrintQuote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [quoteDetails, setQuoteDetails] = useState([]);
  const [client, setClient] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isPrintCompleted, setPrintCompleted] = useState(false);

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
        const [quoteResponse, companyResponse] = await Promise.all([
          axios.get(`${ServerIP}/auth/quote/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${ServerIP}/auth/jomcontrol`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (quoteResponse.data.Status) {
          const quoteData = quoteResponse.data.Result;
          setQuote(quoteData);

          console.log("quote.preparedby", quoteData.preparedBy);
          // Fetch complete employee data if preparedBy exists
          if (quoteData.preparedBy) {
            try {
              const employeeResponse = await axios.get(
                `${ServerIP}/employee/detail/${quoteData.preparedBy}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (employeeResponse.data && employeeResponse.data.length > 0) {
                const employeeData = employeeResponse.data[0];
                quoteData.preparedByName =
                  employeeData.fullName || employeeData.name;
                quoteData.preparedByEmail = employeeData.email || "";
                quoteData.preparedByCellNumber = employeeData.cellNumber || "";
              }
            } catch (empErr) {
              console.error("Error fetching employee details:", empErr);
            }
          }

          // Only fetch client if clientId is not 0
          if (quoteData.clientId && quoteData.clientId !== 0) {
            const clientResponse = await axios.get(
              `${ServerIP}/auth/client/${quoteData.clientId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (clientResponse.data.Status) {
              setClient(clientResponse.data.Result);
            }
          } else {
            // Set a default client object for clientId=0
            setClient({
              clientName: quoteData.clientName || "Walk-in Client",
              customerName: quoteData.customerName || "",
              email: quoteData.email || "",
              phone: quoteData.telNum || "",
              mobile: quoteData.cellNumber || "",
            });
          }

          const detailsResponse = await axios.get(
            `${ServerIP}/auth/quote_details/${id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (detailsResponse.data.Status) {
            setQuoteDetails(detailsResponse.data.Result);
          }

          // Set company info
          if (companyResponse.data.Status) {
            setCompanyInfo(companyResponse.data.Result);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && quote && logoLoaded) {
      // Print after a short delay to ensure rendering
      const printTimer = setTimeout(() => {
        window.print();
      }, 100);

      // Handle print completion
      const handlePrintEvent = () => {
        // Check if the print was completed (not cancelled)
        //        if (window.matchMedia("print").matches) {
        setPrintCompleted(true);
        const token = localStorage.getItem("token");
        console.log("Updating status for quote id:", id); // Debug log

        axios
          .put(
            `${ServerIP}/auth/quote/status/${id}`,
            { status: "Printed" },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          .then((response) => {
            console.log("Status update response:", response); // Debug log
          })
          .catch((err) => {
            console.error("Error updating quote status:", err);
          });
        //        }

        setTimeout(() => {
          navigate(`/dashboard/quotes/edit/${id}`, { replace: true });
        }, 100);
      };

      window.addEventListener("afterprint", handlePrintEvent);

      return () => {
        clearTimeout(printTimer);
        window.removeEventListener("afterprint", handlePrintEvent);
      };
    }
  }, [loading, quote, logoLoaded, id, navigate]);

  if (loading || !quote || !companyInfo || !logoLoaded) {
    return <div>Loading...</div>;
  }

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
          {/* prettier-ignore */}
          <h1>Q  U  O  T  A  T  I  O  N</h1>
        </div>
        <hr className="divider" />

        {/* Quote Info */}
        <div className="quote-info">
          <div className="info-row">
            <div className="info-item">
              <span className="label">Quote No:</span>
              <span className="value">{quote.quoteId}</span>
            </div>
            <div className="info-item">
              <span className="label">Quote Date:</span>
              <span className="value">
                {new Date(quote.quoteDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-item">
              <span className="label">Client:</span>
              <span className="value">
                {client && quote && quote.clientId > 0 && client.customerName
                  ? client.customerName
                  : client
                  ? client.clientName
                  : "Walk-in Client"}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Terms:</span>
              <span className="value">{quote.terms || "30 DAYS"}</span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-item">
              <span className="label">Project Name:</span>
              <span className="value">{quote.projectName}</span>
            </div>
            <div className="info-item">
              <span className="label">Ordered By:</span>
              <span className="value">{quote.orderedBy}</span>
            </div>
            <div className="info-item">
              <span className="label">Due Date:</span>
              <span className="value">
                {quote.dueDate
                  ? new Date(quote.dueDate).toLocaleDateString()
                  : ""}
              </span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-item">
              <span className="label">Email:</span>
              <span className="value">{client ? client.email : ""}</span>
            </div>
            <div className="info-item">
              <span className="label">Tel. No.:</span>
              <span className="value">{client ? client.phone : ""}</span>
            </div>
            <div className="info-item">
              <span className="label">Cell No.:</span>
              <span className="value">{client ? client.mobile : ""}</span>
            </div>
          </div>
        </div>

        {/* Quote Details Table */}
        <table className="quote-details-table">
          <thead>
            <tr>
              <th>Quantity</th>
              <th>Width</th>
              <th>Height</th>
              <th>Unit</th>
              <th>Material - Item Description</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {quoteDetails.map((detail, index) => (
              <tr key={index} className={index % 2 === 0 ? "row-gray" : ""}>
                <td className="quote-details-center">{detail.quantity}</td>
                <td className="quote-details-center">
                  {Number(detail.width || 0).toFixed(2)}
                </td>
                <td className="quote-details-center">
                  {Number(detail.height || 0).toFixed(2)}
                </td>
                <td className="quote-details-center">{detail.unit}</td>
                <td>
                  {detail.material}
                  {detail.itemDescription ? ` - ${detail.itemDescription}` : ""}
                </td>
                <td className="text-right">
                  {Number(detail.unitPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-right">
                  {Number(detail.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="quote-footer-section">
          <div className="prepared-by">
            <div className="signature-line">
              <div className="underline">_________________</div>
              <div>Prepared By: {quote.preparedByName}</div>
              <div>Cellphone: {quote.preparedByCellNumber}</div>
              <div>Email: {quote.preparedByEmail}</div>
            </div>
            <div className="terms-delivery">
              <div>Delivery: {quote.deliveryRemarks}</div>
            </div>
          </div>
          <div className="totals-right">
            {Number(quote.amountDiscount) > 0 ? (
              // Show all totals when there's a discount
              <>
                <div className="total-row">
                  <span>Total Amount:</span>
                  <span>
                    {Number(quote.totalAmount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="total-row">
                  <span>Disc. Amount:</span>
                  <span>
                    {Number(quote.amountDiscount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="total-row">
                  <span>Disc. %:</span>
                  <span>
                    {Number(quote.percentDisc).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            ) : null}
            <div className="total-row grand-total">
              <span>Grand Total:</span>
              <span>
                {Number(quote.grandTotal).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Approval Section */}
        <div className="approval-section">
          <p>{companyInfo?.quoteApproval}</p>
          <div className="signature-section">
            <div className="signature-block">
              <span>
                <div>Approved by:</div>
                <div className="signature-line">Authorized Signature</div>
                <div>Printed Name, Signature & Date</div>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="document-footer">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="edited-by">
              {quote.editedBy && <span>Last edited by: {quote.editedBy}</span>}
            </div>
            <div className="print-date">
              {quote.lastedited && (
                <span>
                  Printed:
                  {new Date(quote.lastedited).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintQuote;
