import React from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const SOADetails = ({ data }) => {
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
            <th>Order ID</th>
            <th>Date</th>
            <th>Reference</th>
            <th>Project</th>
            <th>Terms</th>
            <th>Prepared By</th>
            <th className="text-end">Amount</th>
            <th className="text-center">Disc %</th>
            <th className="text-end">Disc Amt</th>
            <th className="text-end">Total</th>
            <th className="text-end">Paid</th>
            <th className="text-end">Balance</th>
            <th>Date Paid</th>
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
              <td className="text-end">₱{formatNumber(item.totalAmount)}</td>
              <td className="text-center">{item.percentDisc}%</td>
              <td className="text-end">₱{formatNumber(item.amountDisc)}</td>
              <td className="text-end">₱{formatNumber(item.grandTotal)}</td>
              <td className="text-end">₱{formatNumber(item.amountPaid)}</td>
              <td className="text-end">₱{formatNumber(item.balance)}</td>
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
              ₱
              {formatNumber(
                data.reduce((sum, item) => sum + item.totalAmount, 0)
              )}
            </td>
            <td></td>
            <td className="text-end">
              ₱
              {formatNumber(
                data.reduce((sum, item) => sum + item.amountDisc, 0)
              )}
            </td>
            <td className="text-end">
              ₱
              {formatNumber(
                data.reduce((sum, item) => sum + item.grandTotal, 0)
              )}
            </td>
            <td className="text-end">
              ₱
              {formatNumber(
                data.reduce((sum, item) => sum + item.amountPaid, 0)
              )}
            </td>
            <td className="text-end">
              ₱{formatNumber(data.reduce((sum, item) => sum + item.balance, 0))}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default SOADetails;
