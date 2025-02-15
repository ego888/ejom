import React, { useState, useEffect, useRef } from "react";
import { formatNumber } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const ReportSalesSummary = ({ data, groupBy }) => {
  // ✅ Store last applied groupBy to prevent unwanted header changes
  const lastFetchedGroupBy = useRef(groupBy);
  const [displayData, setDisplayData] = useState([]);

  // ✅ Only update when **new data is received**
  useEffect(() => {
    if (data.length > 0) {
      setDisplayData(data);
      lastFetchedGroupBy.current = groupBy; // ✅ Update last applied groupBy
    }
  }, [data, groupBy]);

  // ✅ Define Dynamic Headers Based on `lastFetchedGroupBy`
  const renderHeader = () => {
    switch (lastFetchedGroupBy.current) {
      case "sales":
        return ["Order Count", "Sales Rep", "Total Sales", "Amount Paid"];
      case "client":
        return ["Order Count", "Client", "Total Sales", "Amount Paid"];
      case "month":
        return ["Order Count", "Month", "Total Sales", "Amount Paid"];
      case "material":
        return ["Order Count", "Material", "Total Amount", "Amount Paid"];
      case "machine":
        return ["Order Count", "Machine Type", "Total Amount", "Amount Paid"];
      default:
        return ["", "Total Orders", "Total Sales", "Amount Paid"]; // No Grouping
    }
  };

  // ✅ Define Row Data Based on `lastFetchedGroupBy`
  const renderRow = (item) => {
    switch (lastFetchedGroupBy.current) {
      case "sales":
      case "client":
      case "month":
        return [
          item.orderCount,
          item.category || "Unknown",
          formatNumber(item.totalSales),
          formatNumber(item.amountPaid || 0),
        ];
      case "material":
      case "machine":
        console.log("Material or Machine", item);
        return [
          item.orderCount,
          item.category || "Unknown",
          formatNumber(item.totalAmount),
          formatNumber(item.amountPaid || 0),
        ];
      default:
        return [
          item.orderCount,
          "",
          formatNumber(item.totalSales || item.totalAmount),
          formatNumber(item.amountPaid || 0),
        ]; // No Grouping
    }
  };

  // ✅ Calculate Totals
  const totals = displayData.reduce(
    (acc, curr) => ({
      totalOrders: acc.totalOrders + (curr.orderCount || 0),
      totalAmount: acc.totalAmount + (curr.totalSales || curr.totalAmount || 0),
      totalPaid: acc.totalPaid + (curr.amountPaid || 0),
    }),
    { totalAmount: 0, totalOrders: 0, totalPaid: 0 }
  );

  const isMaterialOrMachine = ["material", "machine"].includes(
    lastFetchedGroupBy.current
  );

  // Add a function to get the report title
  const getReportTitle = () => {
    switch (lastFetchedGroupBy.current) {
      case "sales":
        return "Sales Report - by Sales";
      case "client":
        return "Sales Report - by Client";
      case "month ":
        return "Sales Report - by Month";
      case "material":
        return "Sales Report - by Material";
      case "machine":
        return "Sales Report - by Machine";
      default:
        return "Sales Report";
    }
  };

  return (
    <div className="report-summary-container">
      <h4 className="report-title">{getReportTitle()}</h4>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              {renderHeader().map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.length > 0 ? (
              displayData.map((item, index) => (
                <tr key={index}>
                  {renderRow(item).map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={renderHeader().length} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="table-active">
              <td colSpan={lastFetchedGroupBy.current ? 2 : 1}>
                Total Orders: {totals.totalOrders}
              </td>
              <td>
                {isMaterialOrMachine ? "Total Amount: " : "Total Sales: "}P
                {formatNumber(totals.totalAmount)}
              </td>
              <td>Amount Paid: P{formatNumber(totals.totalPaid)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReportSalesSummary;
