import React, { useState, useEffect, useRef } from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
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

  console.log("lastFetchedGroupBy:", lastFetchedGroupBy.current);
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
        return ["Total Orders", "Total Sales", "Amount Paid"]; // No Grouping
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
          item.totalSales ? formatNumber(item.totalSales) : "",
          item.amountPaid ? formatNumber(item.amountPaid) : "",
        ];
      case "material":
      case "machine":
        console.log("Material or Machine", item);
        return [
          item.orderCount,
          item.category || "Unknown",
          item.totalAmount ? formatNumber(item.totalAmount) : "",
          item.amountPaid ? formatNumber(item.amountPaid) : "",
        ];
      default:
        return [
          item.orderCount,
          "",
          item.totalSales || item.totalAmount
            ? formatNumber(item.totalSales || item.totalAmount)
            : "",
          item.amountPaid ? formatNumber(item.amountPaid) : "",
        ]; // No Grouping
    }
  };

  // ✅ Calculate Totals
  const totals = displayData.reduce(
    (acc, curr) => ({
      totalOrders: acc.totalOrders + Number(curr.orderCount || 0),
      totalAmount:
        acc.totalAmount + Number(curr.totalSales || curr.totalAmount || 0),
      totalPaid: acc.totalPaid + Number(curr.amountPaid || 0),
    }),
    { totalAmount: 0, totalOrders: 0, totalPaid: 0 }
  );
  console.log("totals:", totals);

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
    <div>
      <h4 className="report-title">{getReportTitle()}</h4>
      <div className="table-responsive w-50 mx-auto">
        <table className="table table-hover table-striped">
          <thead>
            <tr>
              {renderHeader().map((header, index) => (
                <th className="text-center" key={index}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.length > 0 ? (
              displayData
                .filter((item) => {
                  // Only filter out zero amounts for client and material/machine cases
                  if (
                    ["client", "material", "machine"].includes(
                      lastFetchedGroupBy.current
                    )
                  ) {
                    return (item.totalSales || item.totalAmount) > 0;
                  }
                  return true; // Keep all rows for other report types
                })
                .map((item, index) => (
                  <tr key={index}>
                    {Object.values(item).map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cellIndex > 1 ? "text-end" : "text-center"}
                      >
                        {cellIndex > 1 ? formatNumber(value) : value}
                      </td>
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
              <td colSpan={lastFetchedGroupBy.current === "none" ? 1 : 2}>
                Total Orders: {totals.totalOrders}
              </td>
              <td className="text-end">
                <strong>{isMaterialOrMachine ? "Total: " : "Sales: "}P</strong>
                <strong>{formatNumber(totals.totalAmount)}</strong>
              </td>
              <td className="text-end">
                <strong>Paid: </strong>
                <strong>{formatNumber(totals.totalPaid)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReportSalesSummary;
