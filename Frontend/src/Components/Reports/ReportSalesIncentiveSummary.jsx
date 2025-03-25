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
        processedOrderIds: new Set(), // Track which orders we've counted
      };
    }

    // Only count order and totalAmount once per orderId
    if (!acc[preparedBy].processedOrderIds.has(order.orderId)) {
      acc[preparedBy].orderCount++;
      acc[preparedBy].totalAmount += parseFloat(order.grandTotal) || 0;
      acc[preparedBy].processedOrderIds.add(order.orderId);
    }

    // These should be summed for all items
    acc[preparedBy].salesIncentive += parseFloat(order.salesIncentive) || 0;
    acc[preparedBy].overideIncentive += parseFloat(order.overideIncentive) || 0;

    return acc;
  }, {});

  // Clean up the processed order IDs before converting to array
  const summaryArray = Object.values(summarizedData).map(
    ({ processedOrderIds, ...rest }) => rest
  );

  // Calculate grand totals using the same logic
  const grandTotals = data.orders.reduce(
    (totals, order) => {
      if (!totals.processedOrderIds.has(order.orderId)) {
        totals.orderCount++;
        totals.totalAmount += parseFloat(order.grandTotal) || 0;
        totals.processedOrderIds.add(order.orderId);
      }
      totals.salesIncentive += parseFloat(order.salesIncentive) || 0;
      totals.overideIncentive += parseFloat(order.overideIncentive) || 0;
      return totals;
    },
    {
      orderCount: 0,
      totalAmount: 0,
      salesIncentive: 0,
      overideIncentive: 0,
      processedOrderIds: new Set(),
    }
  );

  return (
    <div className="report-summary-container">
      <h4 className="report-title">Sales Incentive Summary Report</h4>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              <th className="text-center">Prepared By</th>
              <th className="text-center">Order Count</th>
              <th className="text-center">Total Amount</th>
              <th className="text-center">Sales Incentive</th>
              <th className="text-center">Override Incentive</th>
              <th className="text-center">Total Incentive</th>
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
                <td className="text-center">{grandTotals.orderCount}</td>
                <td className="text-end">
                  ₱{formatNumber(grandTotals.totalAmount)}
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
