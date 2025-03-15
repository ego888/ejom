import React from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const ReportSalesIncentiveSummary = ({ data }) => {
  // Group and summarize data by preparedBy
  const summarizedData = data.orders.reduce((acc, order) => {
    const preparedBy = order.preparedBy || "Unknown";

    if (!acc[preparedBy]) {
      acc[preparedBy] = {
        preparedBy,
        orderCount: 0,
        totalAmount: 0,
        salesIncentive: 0,
        overideIncentive: 0,
      };
    }

    acc[preparedBy].orderCount++;
    acc[preparedBy].totalAmount += order.amount || 0;
    acc[preparedBy].salesIncentive += order.salesIncentive || 0;
    acc[preparedBy].overideIncentive += order.overideIncentive || 0;

    return acc;
  }, {});

  const summaryArray = Object.values(summarizedData);

  return (
    <div className="report-summary-container">
      <h4 className="report-title">Sales Incentive Summary Report</h4>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              <th className="text-center">Prepared By</th>
              <th className="text-center">Orders</th>
              <th className="text-center">Total</th>
              <th className="text-center">Sales</th>
              <th className="text-center">Override</th>
              <th className="text-center">Total</th>
            </tr>
            <tr>
              <th className="text-center">Name</th>
              <th className="text-center">Count</th>
              <th className="text-center">Amount</th>
              <th className="text-center">Incentive</th>
              <th className="text-center">Incentive</th>
              <th className="text-center">Incentives</th>
            </tr>
          </thead>
          <tbody>
            {summaryArray.map((item, index) => (
              <tr key={index}>
                <td>{item.preparedBy}</td>
                <td className="text-center">{item.orderCount}</td>
                <td className="text-end">₱{formatNumber(item.totalAmount)}</td>
                <td className="text-end border-start">
                  ₱{formatNumber(item.salesIncentive)}
                </td>
                <td className="text-end">
                  ₱{formatNumber(item.overideIncentive)}
                </td>
                <td className="text-end border-start">
                  ₱{formatNumber(item.salesIncentive + item.overideIncentive)}
                </td>
              </tr>
            ))}
          </tbody>
          {summaryArray.length > 0 && (
            <tfoot className="table-active">
              <tr>
                <td className="text-end">Total:</td>
                <td className="text-center">
                  {summaryArray.reduce((sum, item) => sum + item.orderCount, 0)}
                </td>
                <td className="text-end">
                  ₱
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) => sum + item.totalAmount,
                      0
                    )
                  )}
                </td>
                <td className="text-end border-start">
                  ₱
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) => sum + item.salesIncentive,
                      0
                    )
                  )}
                </td>
                <td className="text-end">
                  ₱
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) => sum + item.overideIncentive,
                      0
                    )
                  )}
                </td>
                <td className="text-end border-start">
                  ₱
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) =>
                        sum + item.salesIncentive + item.overideIncentive,
                      0
                    )
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ReportSalesIncentiveSummary;
