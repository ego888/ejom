import React, { useState } from "react";
import {
  formatNumber,
  formatPeso,
  formatNumberZ,
} from "../../utils/orderUtils";
import "./ReportSalesSummary.css";

const ReportSalesIncentiveDetails = ({ data }) => {
  const [sortField, setSortField] = useState("orderId");
  const [sortDirection, setSortDirection] = useState("asc");
  const [groupBy, setGroupBy] = useState(null); // null, "preparedBy", or "clientName"

  // Sort and group the data
  let calculatedData = [...data.orders];

  // Sort the data
  calculatedData.sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle dates
    if (sortField === "productionDate") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle numbers
    if (typeof aValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Handle strings and dates
    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return bValue > aValue ? 1 : -1;
    }
  });

  // Group the data if grouping is enabled
  let groupedData = [];
  if (groupBy) {
    const groups = {};
    calculatedData.forEach((item) => {
      const groupValue = item[groupBy] || "Unknown";
      if (!groups[groupValue]) {
        groups[groupValue] = {
          items: [],
          subtotals: {
            grandTotal: 0,
            amount: 0,
            salesIncentive: 0,
            overideIncentive: 0,
            orderCount: 0,
            uniqueOrders: new Set(),
            processedOrderIds: new Set(), // Track which orders we've counted
          },
        };
      }
      groups[groupValue].items.push(item);

      // Only add grandTotal if we haven't processed this order yet
      if (!groups[groupValue].subtotals.processedOrderIds.has(item.orderId)) {
        groups[groupValue].subtotals.grandTotal +=
          parseFloat(item.grandTotal) || 0;
        groups[groupValue].subtotals.processedOrderIds.add(item.orderId);
      }

      // These should be summed for all items
      groups[groupValue].subtotals.amount += parseFloat(item.amount) || 0;
      groups[groupValue].subtotals.salesIncentive +=
        parseFloat(item.salesIncentive) || 0;
      groups[groupValue].subtotals.overideIncentive +=
        parseFloat(item.overideIncentive) || 0;
      groups[groupValue].subtotals.uniqueOrders.add(item.orderId);
    });

    // Convert groups to array format and sort by group value
    Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([groupValue, group]) => {
        // Calculate final order count from unique orders
        group.subtotals.orderCount = group.subtotals.uniqueOrders.size;
        delete group.subtotals.uniqueOrders; // Clean up Set before adding to groupedData
        delete group.subtotals.processedOrderIds; // Clean up processed orders tracking

        groupedData.push({ type: "groupHeader", value: groupValue });
        group.items.forEach((item) =>
          groupedData.push({ type: "item", ...item })
        );
        groupedData.push({
          type: "subtotal",
          ...group.subtotals,
          groupValue,
        });
      });
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleGroup = (field) => {
    setGroupBy(groupBy === field ? null : field);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const getGroupIcon = (field) => {
    return groupBy === field ? "⊟" : "⊞";
  };

  // Track previous row for comparison
  let previousOrderId = null;

  return (
    <div className="report-container">
      <h4 className="report-title">Sales Incentive Report</h4>
      <div className="report-table-container">
        <table className="table table-hover report-table">
          <thead className="table-active">
            <tr>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("orderId")}
              >
                JO # {getSortIcon("orderId")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("productionDate")}
              >
                Date {getSortIcon("productionDate")}
              </th>
              <th className="text-center">
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <span
                    className="cursor-pointer"
                    onClick={() => handleSort("preparedBy")}
                  >
                    Prepared By {getSortIcon("preparedBy")}
                  </span>
                  <span
                    className="cursor-pointer"
                    onClick={() => handleGroup("preparedBy")}
                  >
                    {getGroupIcon("preparedBy")}
                  </span>
                </div>
              </th>
              <th className="text-center">
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <span
                    className="cursor-pointer"
                    onClick={() => handleSort("clientName")}
                  >
                    Client {getSortIcon("clientName")}
                  </span>
                  <span
                    className="cursor-pointer"
                    onClick={() => handleGroup("clientName")}
                  >
                    {getGroupIcon("clientName")}
                  </span>
                </div>
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("grandTotal")}
              >
                Grand Total {getSortIcon("grandTotal")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("materialName")}
              >
                Material {getSortIcon("materialName")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("amount")}
              >
                Amount {getSortIcon("amount")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("perSqFt")}
              >
                Per SqFt {getSortIcon("perSqFt")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("percentDisc")}
              >
                Disc % {getSortIcon("percentDisc")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("salesIncentive")}
              >
                Sales {getSortIcon("salesIncentive")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("overideIncentive")}
              >
                Override {getSortIcon("overideIncentive")}
              </th>
              <th className="text-center">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(groupBy ? groupedData : calculatedData).length > 0 ? (
              (groupBy ? groupedData : calculatedData).map((item, index) => {
                if (groupBy) {
                  if (item.type === "groupHeader") {
                    return (
                      <tr key={`header-${index}`} className="table-primary">
                        <td colSpan={12} className="fw-bold ps-2">
                          {groupBy === "preparedBy"
                            ? "Prepared By: "
                            : "Client: "}
                          {item.value}
                        </td>
                      </tr>
                    );
                  }
                  if (item.type === "subtotal") {
                    return (
                      <tr key={`subtotal-${index}`} className="table-secondary">
                        <td colSpan={2} className="text-end fw-bold">
                          Subtotal for {item.groupValue}:
                        </td>
                        <td className="text-center fw-bold">
                          {item.orderCount} orders
                        </td>
                        <td></td>
                        <td className="text-end fw-bold">
                          {formatPeso(item.grandTotal)}
                        </td>
                        <td></td>
                        <td className="text-end fw-bold">
                          {formatPeso(item.amount)}
                        </td>
                        <td colSpan={2}></td>
                        <td className="text-end border-start fw-bold">
                          {formatPeso(item.salesIncentive)}
                        </td>
                        <td className="text-end fw-bold">
                          {formatPeso(item.overideIncentive)}
                        </td>
                        <td></td>
                      </tr>
                    );
                  }
                  item = item;
                }

                // Check if this row has the same order as previous
                const sameOrder = item.orderId === previousOrderId;
                previousOrderId = item.orderId;

                return (
                  <tr key={`item-${index}`}>
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
                      {formatPeso(item.amount)}
                    </td>
                    <td
                      className={`text-end ${
                        item.perSqFt < data.settings.HalfIncentiveSqFt
                          ? "red-warning"
                          : ""
                      }`}
                    >
                      {formatNumberZ(item.perSqFt)}
                    </td>
                    <td className="text-center red-warning">
                      {item.percentDisc ? `${item.percentDisc}%` : ""}
                    </td>
                    <td className="text-end border-start">
                      {formatPeso(item.salesIncentive)}
                    </td>
                    <td className="text-end">
                      {formatPeso(item.overideIncentive)}
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
          {calculatedData.length > 0 && (
            <tfoot
              className="table-active"
              style={{
                position: "sticky",
                bottom: 0,
                backgroundColor: "#f8f9fa",
                zIndex: 1,
              }}
            >
              <tr>
                <td colSpan="4" className="text-end">
                  Grand Total:
                </td>
                <td className="text-end">
                  {formatPeso(
                    Array.from(
                      new Set(calculatedData.map((item) => item.orderId))
                    )
                      .map(
                        (orderId) =>
                          calculatedData.find(
                            (item) => item.orderId === orderId
                          )?.grandTotal || 0
                      )
                      .reduce(
                        (sum, grandTotal) => sum + parseFloat(grandTotal),
                        0
                      )
                  )}
                </td>
                <td></td>
                <td className="text-end">
                  {formatPeso(
                    calculatedData.reduce(
                      (sum, item) => sum + parseFloat(item.amount || 0),
                      0
                    )
                  )}
                </td>
                <td></td>
                <td></td>
                <td className="text-end border-start">
                  {formatPeso(
                    calculatedData.reduce(
                      (sum, item) => sum + parseFloat(item.salesIncentive || 0),
                      0
                    )
                  )}
                </td>
                <td className="text-end">
                  {formatPeso(
                    calculatedData.reduce(
                      (sum, item) =>
                        sum + parseFloat(item.overideIncentive || 0),
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
