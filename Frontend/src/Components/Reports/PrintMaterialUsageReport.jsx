import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { formatNumber } from "../../utils/orderUtils";
import "./PrintReports.css";

const PrintMaterialUsageReport = ({ data, dateFrom, dateTo, groupBy }) => {
  useEffect(() => {
    if (data) {
      window.print();
    }
  }, [data]);

  if (!data) return <div>No data available</div>;

  const getColumnHeaders = () => {
    switch (groupBy) {
      case "material":
        return [
          "Material",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
      case "materialType":
        return [
          "Material Type",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
      case "machineType":
        return [
          "Machine Type",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
      default:
        return [
          "Material",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
    }
  };

  // Calculate totals
  const totals = data.reduce(
    (acc, curr) => ({
      totalQuantity: acc.totalQuantity + Number(curr.totalQuantity || 0),
      totalUsage: acc.totalUsage + Number(curr.totalUsage || 0),
      totalAmount: acc.totalAmount + Number(curr.totalAmount || 0),
    }),
    { totalQuantity: 0, totalUsage: 0, totalAmount: 0 }
  );

  const getReportTitle = () => {
    switch (groupBy) {
      case "material":
        return "Material Usage Report - By Material";
      case "materialType":
        return "Material Usage Report - By Material Type";
      case "machineType":
        return "Material Usage Report - By Machine Type";
      default:
        return "Material Usage Report";
    }
  };

  return (
    <div className="print-report">
      <div className="print-header">
        <h2>{getReportTitle()}</h2>
        <p>
          Date Range: {new Date(dateFrom).toLocaleDateString()} to{" "}
          {new Date(dateTo).toLocaleDateString()}
        </p>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            {getColumnHeaders().map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>
                {groupBy === "material"
                  ? row.materialName
                  : groupBy === "materialType"
                  ? row.materialType
                  : row.machineType}
              </td>
              <td className="text-end">
                {Number(row.totalQuantity) === 0
                  ? ""
                  : formatNumber(row.totalQuantity)}
              </td>
              <td className="text-end">
                {Number(row.totalUsage) === 0
                  ? ""
                  : formatNumber(row.totalUsage)}
              </td>
              <td className="text-end">
                {Number(row.totalAmount) === 0
                  ? ""
                  : formatNumber(row.totalAmount)}
              </td>
              <td className="text-end">
                {Number(row.totalUsage) > 0
                  ? formatNumber(row.totalAmount / row.totalUsage)
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="table-active">
            <td>Total</td>
            <td className="text-end">{formatNumber(totals.totalQuantity)}</td>
            <td className="text-end">{formatNumber(totals.totalUsage)}</td>
            <td className="text-end">{formatNumber(totals.totalAmount)}</td>
            <td className="text-end">
              {totals.totalUsage > 0
                ? formatNumber(totals.totalAmount / totals.totalUsage)
                : ""}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PrintMaterialUsageReport;
