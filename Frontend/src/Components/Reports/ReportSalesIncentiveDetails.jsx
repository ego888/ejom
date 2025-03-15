import React from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const ReportSalesIncentiveDetails = ({ data }) => {
  const calculatedData = data.orders;

  // Track previous row for comparison
  let previousOrderId = null;

  return (
    <div className="report-container">
      <h4 className="report-title">Sales Incentive Report</h4>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              <th className="text-center">Order</th>
              <th className="text-center">Date</th>
              <th className="text-center">Prepared</th>
              <th className="text-center">Client</th>
              <th className="text-center">Grand</th>
              <th className="text-center">Material</th>
              <th className="text-center">Amount</th>
              <th className="text-center">Per</th>
              <th className="text-center">Disc</th>
              <th className="text-center" colSpan="2">
                Incentives
              </th>
              <th className="text-center"></th>
            </tr>
            <tr>
              <th className="text-center">ID</th>
              <th className="text-center"></th>
              <th className="text-center">By</th>
              <th className="text-center"></th>
              <th className="text-center">Total</th>
              <th className="text-center"></th>
              <th className="text-center"></th>
              <th className="text-center">SqFt</th>
              <th className="text-center">%</th>
              <th className="text-center">Sales</th>
              <th className="text-center">Override</th>
              <th className="text-center">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {calculatedData && calculatedData.length > 0 ? (
              calculatedData.map((item, index) => {
                // Check if this row has the same order as previous
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
                    <td>{!sameOrder ? item.preparedBy : ""}</td>
                    <td>{!sameOrder ? item.clientName : ""}</td>
                    <td className="text-end">
                      {!sameOrder ? `₱${formatNumber(item.grandTotal)}` : ""}
                    </td>
                    <td>{item.materialName}</td>
                    <td className="text-end" style={{ fontWeight: "bold" }}>
                      ₱{formatNumber(item.amount)}
                    </td>
                    <td
                      className={`text-end ${
                        item.perSqFt < data.settings.HalfIncentiveSqFt
                          ? "red-warning"
                          : ""
                      }`}
                    >
                      {formatNumber(item.perSqFt)}
                    </td>
                    <td className="text-center red-warning">
                      {item.percentDisc ? `${item.percentDisc}%` : ""}
                    </td>
                    <td className="text-end border-start">
                      ₱{formatNumber(item.salesIncentive)}
                    </td>
                    <td className="text-end">
                      ₱{formatNumber(item.overideIncentive)}
                    </td>
                    <td className="text-left">{item.remarks}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
          {calculatedData && calculatedData.length > 0 && (
            <tfoot className="table-active">
              <tr>
                <td colSpan="4" className="text-end">
                  Total:
                </td>
                <td className="text-end">
                  ₱
                  {formatNumber(
                    calculatedData.reduce(
                      (sum, item) => sum + item.grandTotal,
                      0
                    )
                  )}
                </td>
                <td></td>
                <td className="text-end">
                  ₱
                  {formatNumber(
                    calculatedData.reduce((sum, item) => sum + item.amount, 0)
                  )}
                </td>
                <td></td>
                <td></td>
                <td className="text-end border-start">
                  ₱
                  {formatNumber(
                    calculatedData.reduce(
                      (sum, item) => sum + item.salesIncentive,
                      0
                    )
                  )}
                </td>
                <td className="text-end">
                  ₱
                  {formatNumber(
                    calculatedData.reduce(
                      (sum, item) => sum + item.overideIncentive,
                      0
                    )
                  )}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ReportSalesIncentiveDetails;
