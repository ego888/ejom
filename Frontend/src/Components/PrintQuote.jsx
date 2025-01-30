import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerIP } from "../config";
import GoLargeLogo from "../assets/Go Large logo 2009C2 small.jpg";
import "./PrintQuote.css";

function PrintQuote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [quoteDetails, setQuoteDetails] = useState([]);
  const [client, setClient] = useState(null);
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
        const [quoteResponse, employeesResponse] = await Promise.all([
          axios.get(`${ServerIP}/auth/quote/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${ServerIP}/auth/sales_employees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (quoteResponse.data.Status) {
          const quoteData = quoteResponse.data.Result;
          setQuote(quoteData);

          // Find employee name
          if (employeesResponse.data.Status) {
            const employee = employeesResponse.data.Result.find(
              (emp) => emp.id === quoteData.preparedBy
            );
            if (employee) {
              quoteData.preparedByName = employee.name;
            }
          }

          const clientResponse = await axios.get(
            `${ServerIP}/auth/client/${quoteData.clientId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (clientResponse.data.Status) {
            setClient(clientResponse.data.Result);
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
        }
      } catch (err) {
        console.error("Error fetching quote data:", err);
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

  if (loading || !quote || !client || !logoLoaded) {
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
            <p>Rabaya St., Kimba</p>
            <p>Talisay City 6045, Philippines</p>
            <p>Telfax# 427-7137</p>
          </div>
        </div>

        <hr className="divider" />
        <div className="quote-title">
          <h1>Q U O T A T I O N</h1>
        </div>
        <hr className="divider" />

        {/* Quote Info */}
        <div className="quote-info">
          <div className="quote-info-left">
            <div className="info-row">
              <span className="label">Quote No:</span>
              <span className="value">{quote.quoteId}</span>
            </div>
            <div className="info-row">
              <span className="label">Client:</span>
              <span className="value">{client.clientName}</span>
            </div>
            <div className="info-row">
              <span className="label">Ordered By:</span>
              <span className="value">{quote.orderedBy}</span>
            </div>
            <div className="info-row">
              <span className="label">Email:</span>
              <span className="value">{quote.email}</span>
            </div>{" "}
            <div className="info-row">
              <span className="label">Cell No.:</span>
              <span className="value">{quote.cellNumber}</span>
            </div>
          </div>
          <div className="quote-info-right">
            <div className="info-row">
              <span className="label">Quote Date:</span>
              <span className="value">
                {new Date(quote.quoteDate).toLocaleDateString()}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Project Name:</span>
              <span className="value">{quote.projectName}</span>
            </div>
            <div className="info-row">
              <span className="label">Due Date:</span>
              <span className="value">
                {quote.dueDate
                  ? new Date(quote.dueDate).toLocaleDateString()
                  : ""}
              </span>
            </div>{" "}
            <div className="info-row">
              <span className="label">Tel. No.:</span>
              <span className="value">{quote.telNum}</span>
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
                  {detail.width.toFixed(2)}
                </td>
                <td className="quote-details-center">
                  {detail.height.toFixed(2)}
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
              <span>Prepared By: </span>
              <span className="line">{quote.preparedByName}</span>
            </div>
            <div className="terms-delivery">
              <div>Terms: {quote.terms || "30 DAYS"}</div>
              <div>Delivery: First delivery within 1-2 days.</div>
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
          <p>
            We hereby approve the above quotation and authorize GO LARGE
            GRAPHICS, INC. to produce and fulfill the same for our account.
            (Please date and sign in full)
          </p>
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
