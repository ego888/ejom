import React, { useEffect, useState } from "react";
import { formatNumber } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";
import "./ReportArtistIncentiveDetails.css";
import { jwtDecode } from "jwt-decode";

const ReportArtistIncentiveDetails = ({ data }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const calculatedData = data.orders;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.categoryId === 1);
    }
  }, []);

  // Track previous row for comparison
  let previousOrderId = null;

  return (
    <div className="report-container">
      <h4 className="report-title">Artist Incentive Detailed Report</h4>
      <table className="table table-hover">
        <thead className="table-active">
          <tr>
            <th className="text-center">Order</th>
            <th className="text-center">Date</th>
            <th className="text-center">Client</th>
            <th className="text-center">Material</th>
            <th className="text-center">Artist</th>
            <th className="text-center">Grand</th>
            <th className="text-center">Qty</th>
            <th className="text-center">Per</th>
            <th className="text-center" colSpan="3">
              Major
            </th>
            <th className="text-center" colSpan="3">
              Minor
            </th>
            <th className="text-center">Total</th>
            {isAdmin && <th className="text-center">Max</th>}
            <th className="text-center"></th>
          </tr>
          <tr>
            <th className="text-center">ID</th>
            <th className="text-center"></th>
            <th className="text-center"></th>
            <th className="text-center"></th>
            <th className="text-center"></th>
            <th className="text-center">Total</th>
            <th className="text-center"></th>
            <th className="text-center">SqFt</th>
            <th className="text-center">Orig</th>
            <th className="text-center">Adj</th>
            <th className="text-center">Amount</th>
            <th className="text-center">Orig</th>
            <th className="text-center">Adj</th>
            <th className="text-center">Amount</th>
            <th className="text-center">Incentive</th>
            {isAdmin && <th className="text-center">Amount</th>}
            <th className="text-center">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {calculatedData && calculatedData.length > 0 ? (
            calculatedData.map((item, index) => {
              const sameOrder = item.orderId === previousOrderId;
              previousOrderId = item.orderId;
              return (
                <tr key={index}>
                  <td>{!sameOrder ? item.orderId : ""}</td>
                  <td>
                    {!sameOrder
                      ? new Date(item.productionDate).toLocaleDateString()
                      : ""}
                  </td>
                  <td>{!sameOrder ? item.clientName : ""}</td>
                  <td>{item.materialName}</td>
                  <td>{item.artistIncentive || "Unknown"}</td>
                  <td className="text-end">
                    {!sameOrder ? `₱${formatNumber(item.grandTotal)}` : ""}
                  </td>
                  <td className="text-center">{formatNumber(item.quantity)}</td>
                  <td
                    className={`text-end ${
                      item.perSqFt < data.settings.HalfIncentiveSqFt
                        ? "red-warning"
                        : ""
                    }`}
                  >
                    {formatNumber(item.perSqFt)}
                  </td>
                  <td className="text-end border-start">
                    {formatNumber(item.originalMajor)}
                  </td>
                  <td
                    className={`text-end ${
                      item.originalMajor !== item.adjustedMajor
                        ? "red-warning"
                        : ""
                    }`}
                  >
                    {formatNumber(item.adjustedMajor)}
                  </td>
                  <td className="text-end">{formatNumber(item.majorAmount)}</td>
                  <td className="text-end border-start">
                    {formatNumber(item.originalMinor)}
                  </td>
                  <td
                    className={`text-end ${
                      item.originalMinor !== item.adjustedMinor
                        ? "red-warning"
                        : ""
                    }`}
                  >
                    {formatNumber(item.adjustedMinor)}
                  </td>
                  <td className="text-end">{formatNumber(item.minorAmount)}</td>
                  <td className="text-end border-start">
                    ₱{formatNumber(item.totalIncentive)}
                  </td>
                  {isAdmin && (
                    <td className="text-end">
                      {!sameOrder
                        ? `₱${formatNumber(item.maxOrderIncentive)}`
                        : ""}
                    </td>
                  )}
                  <td className="text-left">{item.remarks}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={isAdmin ? 17 : 16} className="text-center">
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReportArtistIncentiveDetails;
