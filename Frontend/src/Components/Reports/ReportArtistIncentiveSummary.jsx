import React, { useEffect, useState } from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";
import { jwtDecode } from "jwt-decode";

const ReportArtistIncentiveSummary = ({ data }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Token:", token);

    if (token) {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.categoryId === 1);
    }
  }, []);

  // Group and summarize data by artist
  const summarizedData = data.orders.reduce((acc, order) => {
    const artist = order.artistIncentive || "Unknown";
    const orderKey = `${order.orderId}_${artist}`;

    if (!acc[artist]) {
      acc[artist] = {
        artist,
        orderCount: 0,
        totalQuantity: 0,
        totalGrand: 0,
        majorOriginal: 0,
        majorAdjusted: 0,
        majorAmount: 0,
        minorOriginal: 0,
        minorAdjusted: 0,
        minorAmount: 0,
        totalIncentive: 0,
        maxIncentive: 0,
        processedOrders: new Set(), // Track processed orders
      };
    }

    acc[artist].totalQuantity += order.quantity;
    acc[artist].majorOriginal += order.originalMajor;
    acc[artist].majorAdjusted += order.adjustedMajor;
    acc[artist].majorAmount += order.majorAmount;
    acc[artist].minorOriginal += order.originalMinor;
    acc[artist].minorAdjusted += order.adjustedMinor;
    acc[artist].minorAmount += order.minorAmount;
    acc[artist].totalIncentive += order.totalIncentive;

    // Only add these once per order
    if (!acc[artist].processedOrders.has(order.orderId)) {
      acc[artist].orderCount++;
      acc[artist].totalGrand += order.grandTotal;
      acc[artist].maxIncentive += order.maxOrderIncentive;
      acc[artist].processedOrders.add(order.orderId);
    }

    return acc;
  }, {});

  // Clean up by removing the processedOrders Set before rendering
  const summaryArray = Object.values(summarizedData).map(
    ({ processedOrders, ...rest }) => rest
  );

  // Track previous group for comparison
  let previousGroup = null;

  return (
    <div className="report-summary-container">
      <h4 className="report-title">Artist Incentive Summary Report</h4>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              <th className="text-center">Artist</th>
              <th className="text-center">Orders</th>
              <th className="text-center">Grand</th>
              <th className="text-center">Total</th>
              <th className="text-center" colSpan="3">
                Major
              </th>
              <th className="text-center" colSpan="3">
                Minor
              </th>
              <th className="text-center">Total</th>
              {isAdmin && <th className="text-center">Max</th>}
            </tr>
            <tr>
              <th className="text-center">Name</th>
              <th className="text-center">Count</th>
              <th className="text-center">Total</th>
              <th className="text-center">Qty</th>
              <th className="text-center">Orig</th>
              <th className="text-center">Adj</th>
              <th className="text-center">Amount</th>
              <th className="text-center">Orig</th>
              <th className="text-center">Adj</th>
              <th className="text-center">Amount</th>
              <th className="text-center">Incentive</th>
              {isAdmin && <th className="text-center">Amount</th>}
            </tr>
          </thead>
          <tbody>
            {summaryArray.length > 0 ? (
              summaryArray.map((item, index) => {
                const sameGroup = item.artist === previousGroup;
                previousGroup = item.artist;
                return (
                  <tr key={index}>
                    <td>{item.artist}</td>
                    <td className="text-center">{item.orderCount}</td>
                    <td className="text-end">
                      ₱{formatNumber(item.totalGrand)}
                    </td>
                    <td className="text-center">{item.totalQuantity}</td>
                    <td className="text-center border-start">
                      {item.majorOriginal}
                    </td>
                    <td className="text-center">{item.majorAdjusted}</td>
                    <td className="text-center">
                      {formatNumber(item.majorAmount)}
                    </td>
                    <td className="text-center border-start">
                      {item.minorOriginal}
                    </td>
                    <td className="text-center">{item.minorAdjusted}</td>
                    <td className="text-center">
                      {formatNumber(item.minorAmount)}
                    </td>
                    <td className="text-end border-start">
                      ₱{formatNumber(item.totalIncentive)}
                    </td>
                    {isAdmin && (
                      <td className="text-end">
                        {!sameGroup
                          ? `₱${formatNumber(item.maxIncentive)}`
                          : ""}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isAdmin ? 12 : 11} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
          {summaryArray.length > 0 && (
            <tfoot className="table-active">
              <tr>
                <td>Total</td>
                <td className="text-center">
                  {summaryArray.reduce((sum, item) => sum + item.orderCount, 0)}
                </td>
                <td className="text-end">
                  ₱
                  {formatNumber(
                    summaryArray.reduce((sum, item) => sum + item.totalGrand, 0)
                  )}
                </td>
                <td className="text-center">
                  {summaryArray.reduce(
                    (sum, item) => sum + item.totalQuantity,
                    0
                  )}
                </td>
                <td className="text-center border-start">
                  {summaryArray.reduce(
                    (sum, item) => sum + item.majorOriginal,
                    0
                  )}
                </td>
                <td className="text-center">
                  {summaryArray.reduce(
                    (sum, item) => sum + item.majorAdjusted,
                    0
                  )}
                </td>
                <td className="text-center">
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) => sum + item.majorAmount,
                      0
                    )
                  )}
                </td>
                <td className="text-center border-start">
                  {summaryArray.reduce(
                    (sum, item) => sum + item.minorOriginal,
                    0
                  )}
                </td>
                <td className="text-center">
                  {summaryArray.reduce(
                    (sum, item) => sum + item.minorAdjusted,
                    0
                  )}
                </td>
                <td className="text-center">
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) => sum + item.minorAmount,
                      0
                    )
                  )}
                </td>
                <td className="text-end border-start">
                  ₱
                  {formatNumber(
                    summaryArray.reduce(
                      (sum, item) => sum + item.totalIncentive,
                      0
                    )
                  )}
                </td>
                {isAdmin && (
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      summaryArray.reduce(
                        (sum, item) => sum + item.maxIncentive,
                        0
                      )
                    )}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ReportArtistIncentiveSummary;
