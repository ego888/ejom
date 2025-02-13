import React from "react";
import { formatNumber } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const ReportArtistIncentives = ({ data }) => {
  // Calculate totals
  const totals = data.reduce(
    (acc, curr) => ({
      totalOrders: acc.totalOrders + (curr.orderCount || 0),
      totalAmount: acc.totalAmount + (curr.totalAmount || 0),
      totalPaid: acc.totalPaid + (curr.amountPaid || 0),
    }),
    { totalOrders: 0, totalAmount: 0, totalPaid: 0 }
  );

  return (
    <div className="report-summary-container">
      <h4 className="report-title">Artist Incentive Summary Report</h4>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              <th>Count</th>
              <th>Artist</th>
              <th>Major</th>
              <th>Minor</th>
              <th className="text-end">Total Amount</th>
              <th className="text-end">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr key={index}>
                  <td className="text-center">{item.orderCount}</td>
                  <td>{item.category || "Unknown"}</td>
                  <td>{item.major || "-"}</td>
                  <td>{item.minor || "-"}</td>
                  <td className="text-end">
                    ₱{formatNumber(item.totalAmount)}
                  </td>
                  <td className="text-end">₱{formatNumber(item.amountPaid)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="table-active">
              <td colSpan={2}>Total Orders: {totals.totalOrders}</td>
              <td colSpan={2}></td>
              <td className="text-end">₱{formatNumber(totals.totalAmount)}</td>
              <td className="text-end">₱{formatNumber(totals.totalPaid)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReportArtistIncentives;
