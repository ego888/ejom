import React from "react";
import { formatNumber } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";
import "./ReportArtistIncentiveDetails.css";

const ReportArtistIncentiveDetails = ({ data }) => {
  // Remove calculation here since data is already calculated
  const calculatedData = data.orders;
  console.log("calculatedData:", calculatedData);

  return (
    <div className="report-summary-container">
      <h4 className="report-title">Artist Incentive Detailed Report</h4>
      <div className="table-responsive">
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
              <th className="text-center">Max</th>
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
              <th className="text-center">Amount</th>
              <th className="text-center">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {calculatedData && calculatedData.length > 0 ? (
              calculatedData.map((item, index) => (
                <tr key={index}>
                  <td>{item.orderId}</td>
                  <td>{new Date(item.productionDate).toLocaleDateString()}</td>
                  <td>{item.clientName}</td>
                  <td>{item.materialName}</td>
                  <td>{item.artistIncentive || "Unknown"}</td>
                  <td className="text-end">{formatNumber(item.grandTotal)}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td
                    className={`text-end ${
                      item.perSqFt < data.settings.HalfIncentiveSqFt
                        ? "half-rate-warning"
                        : ""
                    }`}
                  >
                    {formatNumber(item.perSqFt)}
                  </td>
                  <td className="text-center border-start">
                    {item.originalMajor}
                  </td>
                  <td className="text-center">{item.adjustedMajor}</td>
                  <td className="text-center">
                    {formatNumber(item.majorAmount)}
                  </td>
                  <td className="text-center border-start">
                    {item.originalMinor}
                  </td>
                  <td className="text-center">{item.adjustedMinor}</td>
                  <td className="text-center">
                    {formatNumber(item.minorAmount)}
                  </td>
                  <td className="text-end border-start">
                    ₱{formatNumber(item.totalIncentive)}
                  </td>
                  <td className="text-end">
                    ₱{formatNumber(item.maxOrderIncentive)}
                  </td>
                  <td className="text-left">{item.remarks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={16} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportArtistIncentiveDetails;
