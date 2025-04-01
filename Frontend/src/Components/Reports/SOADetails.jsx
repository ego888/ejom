import React, { useEffect } from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const SOADetails = ({ data, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!data || data.length === 0) {
    return <div>No details available</div>;
  }

  return (
    <div className="table-responsive">
      <table
        className="table table-hover"
        aria-label="Statement of Account Details"
      >
        <thead className="table-active">
          <tr>
            <th className="text-center">Order ID</th>
            <th className="text-center">Date</th>
            <th className="text-center">Reference</th>
            <th className="text-center">Project</th>
            <th className="text-center">Terms</th>
            <th className="text-center">Prepared By</th>
            <th className="text-center">Amount</th>
            <th className="text-center">Disc %</th>
            <th className="text-center">Disc Amt</th>
            <th className="text-center">Total</th>
            <th className="text-center">Paid</th>
            <th className="text-center">Balance</th>
            <th className="text-center">Date Paid</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.orderId}</td>
              <td>{new Date(item.productionDate).toLocaleDateString()}</td>
              <td>{item.orderReference}</td>
              <td>{item.projectName}</td>
              <td>{item.terms}</td>
              <td>{item.preparedBy}</td>
              <td className="text-end">
                {item.totalAmount > 0 ? formatPeso(item.totalAmount) : ""}
              </td>
              <td className="text-center">
                {item.percentDisc > 0 ? `${item.percentDisc}%` : ""}
              </td>
              <td className="text-end">
                {item.amountDisc > 0 ? formatPeso(item.amountDisc) : ""}
              </td>
              <td className="text-end">
                {item.grandTotal > 0 ? formatPeso(item.grandTotal) : ""}
              </td>
              <td className="text-end">
                {item.amountPaid > 0 ? formatPeso(item.amountPaid) : ""}
              </td>
              <td className="text-end">
                {item.balance > 0 ? formatPeso(item.balance) : ""}
              </td>
              <td>
                {item.datePaid
                  ? new Date(item.datePaid).toLocaleDateString()
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="table-active">
          <tr>
            <td colSpan="6" className="text-end">
              Total:
            </td>
            <td className="text-end">
              {formatPeso(
                data.reduce(
                  (sum, item) => sum + (Number(item.totalAmount) || 0),
                  0
                )
              )}
            </td>
            <td></td>
            <td className="text-end">
              {formatPeso(
                data.reduce(
                  (sum, item) => sum + (Number(item.amountDisc) || 0),
                  0
                )
              )}
            </td>
            <td className="text-end">
              {formatPeso(
                data.reduce(
                  (sum, item) => sum + (Number(item.grandTotal) || 0),
                  0
                )
              )}
            </td>
            <td className="text-end">
              {formatPeso(
                data.reduce(
                  (sum, item) => sum + (Number(item.amountPaid) || 0),
                  0
                )
              )}
            </td>
            <td className="text-end">
              {formatPeso(
                data.reduce((sum, item) => sum + (Number(item.balance) || 0), 0)
              )}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default SOADetails;
