import React, { useEffect, useState } from "react";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";
import { jwtDecode } from "jwt-decode";

const ReportArtistIncentiveDetails = ({ data }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState("client");
  const [calculatedData, setCalculatedData] = useState([]);

  // Calculate grand totals for the footer
  const grandTotals = calculatedData.reduce(
    (acc, item) => ({
      quantity: (acc.quantity || 0) + Number(item.quantity || 0),
      grandTotal: (acc.grandTotal || 0) + Number(item.grandTotal || 0),
      majorOriginal: (acc.majorOriginal || 0) + Number(item.originalMajor || 0),
      majorAdjusted: (acc.majorAdjusted || 0) + Number(item.adjustedMajor || 0),
      majorAmount: (acc.majorAmount || 0) + Number(item.majorAmount || 0),
      minorOriginal: (acc.minorOriginal || 0) + Number(item.originalMinor || 0),
      minorAdjusted: (acc.minorAdjusted || 0) + Number(item.adjustedMinor || 0),
      minorAmount: (acc.minorAmount || 0) + Number(item.minorAmount || 0),
      totalIncentive:
        (acc.totalIncentive || 0) + Number(item.totalIncentive || 0),
      maxOrderIncentive:
        (acc.maxOrderIncentive || 0) + Number(item.maxOrderIncentive || 0),
    }),
    {}
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.categoryId === 1);
    }
  }, []);

  useEffect(() => {
    // Sort and process the data
    const sortedData = [...data.orders].sort((a, b) => {
      switch (sortBy) {
        case "client":
          return (
            (a.clientName || "").localeCompare(b.clientName || "") ||
            (a.materialName || "").localeCompare(b.materialName || "") ||
            (a.artistIncentive || "Unknown").localeCompare(
              b.artistIncentive || "Unknown"
            )
          );
        case "material":
          return (
            (a.materialName || "").localeCompare(b.materialName || "") ||
            (a.clientName || "").localeCompare(b.clientName || "") ||
            (a.artistIncentive || "Unknown").localeCompare(
              b.artistIncentive || "Unknown"
            )
          );
        case "artist":
          return (
            (a.artistIncentive || "Unknown").localeCompare(
              b.artistIncentive || "Unknown"
            ) ||
            (a.clientName || "").localeCompare(b.clientName || "") ||
            (a.materialName || "").localeCompare(b.materialName || "")
          );
        default:
          return 0;
      }
    });

    setCalculatedData(sortedData);
  }, [data.orders, sortBy]);

  // Function to calculate subtotals
  const calculateSubtotal = (items) => {
    return items.reduce(
      (acc, item) => ({
        quantity: (acc.quantity || 0) + Number(item.quantity || 0),
        grandTotal: (acc.grandTotal || 0) + Number(item.grandTotal || 0),
        majorOriginal:
          (acc.majorOriginal || 0) + Number(item.originalMajor || 0),
        majorAdjusted:
          (acc.majorAdjusted || 0) + Number(item.adjustedMajor || 0),
        majorAmount: (acc.majorAmount || 0) + Number(item.majorAmount || 0),
        minorOriginal:
          (acc.minorOriginal || 0) + Number(item.originalMinor || 0),
        minorAdjusted:
          (acc.minorAdjusted || 0) + Number(item.adjustedMinor || 0),
        minorAmount: (acc.minorAmount || 0) + Number(item.minorAmount || 0),
        totalIncentive:
          (acc.totalIncentive || 0) + Number(item.totalIncentive || 0),
        maxOrderIncentive:
          (acc.maxOrderIncentive || 0) + Number(item.maxOrderIncentive || 0),
      }),
      {}
    );
  };

  // Track previous values for grouping
  let previousClient = null;
  let previousMaterial = null;
  let previousArtist = null;
  let currentGroup = [];

  const getGroupIcon = (field) => {
    return sortBy === field ? "⊟" : "⊞";
  };

  return (
    <div className="report-container">
      <h4 className="report-title">Artist Incentive Detailed Report</h4>
      <div className="report-table-wrapper">
        <div className="table-responsive report-table-container">
          <table className="table table-hover report-table">
            <thead className="table-active sticky-top">
              <tr>
                <th className="text-center">Order</th>
                <th className="text-center">Date</th>
                <th className="text-center">
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <span
                      className="cursor-pointer"
                      onClick={() => setSortBy("client")}
                    >
                      Client {getGroupIcon("client")}
                    </span>
                  </div>
                </th>
                <th className="text-center">
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <span
                      className="cursor-pointer"
                      onClick={() => setSortBy("material")}
                    >
                      Material {getGroupIcon("material")}
                    </span>
                  </div>
                </th>
                <th className="text-center">
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <span
                      className="cursor-pointer"
                      onClick={() => setSortBy("artist")}
                    >
                      Artist {getGroupIcon("artist")}
                    </span>
                  </div>
                </th>
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
                {isAdmin && <th className="text-center">Cap</th>}
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
                calculatedData
                  .map((item, index) => {
                    const currentClient = item.clientName;
                    const currentMaterial = item.materialName;
                    const currentArtist = item.artistIncentive || "Unknown";

                    // Add item to current group for subtotal calculation
                    currentGroup.push(item);

                    // Determine if we need to show subtotal
                    const isLastItem = index === calculatedData.length - 1;
                    const showSubtotal =
                      isLastItem ||
                      (sortBy === "client" &&
                        calculatedData[index + 1]?.clientName !==
                          currentClient) ||
                      (sortBy === "material" &&
                        calculatedData[index + 1]?.materialName !==
                          currentMaterial) ||
                      (sortBy === "artist" &&
                        (calculatedData[index + 1]?.artistIncentive ||
                          "Unknown") !== currentArtist);

                    // Prepare rows to render
                    const rows = [];

                    // Add the data row
                    rows.push(
                      <tr key={`data-${index}`}>
                        <td>{item.orderId}</td>
                        <td>
                          {new Date(item.productionDate).toLocaleDateString()}
                        </td>
                        <td>{currentClient}</td>
                        <td>{currentMaterial}</td>
                        <td>{currentArtist}</td>
                        <td className="text-end">
                          {Number(item.grandTotal)
                            ? formatPeso(item.grandTotal)
                            : ""}
                        </td>
                        <td className="text-center">
                          {Number(item.quantity)
                            ? formatNumber(item.quantity)
                            : ""}
                        </td>
                        <td
                          className={`text-end ${
                            item.perSqFt < data.settings.HalfIncentiveSqFt
                              ? "red-warning"
                              : ""
                          }`}
                        >
                          {Number(item.perSqFt)
                            ? formatNumber(item.perSqFt)
                            : ""}
                        </td>
                        <td className="text-end border-start">
                          {Number(item.originalMajor)
                            ? formatNumber(item.originalMajor)
                            : ""}
                        </td>
                        <td
                          className={`text-end ${
                            item.originalMajor !== item.adjustedMajor
                              ? "red-warning"
                              : ""
                          }`}
                        >
                          {Number(item.adjustedMajor)
                            ? formatNumber(item.adjustedMajor)
                            : ""}
                        </td>
                        <td className="text-end">
                          {Number(item.majorAmount)
                            ? formatNumber(item.majorAmount)
                            : ""}
                        </td>
                        <td className="text-end border-start">
                          {Number(item.originalMinor)
                            ? formatNumber(item.originalMinor)
                            : ""}
                        </td>
                        <td
                          className={`text-end ${
                            item.originalMinor !== item.adjustedMinor
                              ? "red-warning"
                              : ""
                          }`}
                        >
                          {Number(item.adjustedMinor)
                            ? formatNumber(item.adjustedMinor)
                            : ""}
                        </td>
                        <td className="text-end">
                          {Number(item.minorAmount)
                            ? formatNumber(item.minorAmount)
                            : ""}
                        </td>
                        <td className="text-end border-start">
                          {Number(item.totalIncentive)
                            ? formatPeso(item.totalIncentive)
                            : ""}
                        </td>
                        {isAdmin && (
                          <td className="text-end">
                            {Number(item.maxOrderIncentive)
                              ? formatPeso(item.maxOrderIncentive)
                              : ""}
                          </td>
                        )}
                        <td className="text-left">{item.remarks}</td>
                      </tr>
                    );

                    // Add subtotal row if needed
                    if (showSubtotal) {
                      const subtotal = calculateSubtotal(currentGroup);
                      rows.push(
                        <tr key={`subtotal-${index}`} className="table-info">
                          <td colSpan="5" className="text-end fw-bold">
                            {sortBy === "client" && `${currentClient} `}
                            {sortBy === "material" && `${currentMaterial} `}
                            {sortBy === "artist" && `${currentArtist} `}
                            Subtotal:
                          </td>
                          <td className="text-end fw-bold">
                            {Number(subtotal.grandTotal)
                              ? formatPeso(subtotal.grandTotal)
                              : ""}
                          </td>
                          <td className="text-center fw-bold">
                            {Number(subtotal.quantity)
                              ? formatNumber(subtotal.quantity)
                              : ""}
                          </td>
                          <td></td>
                          <td className="text-end border-start fw-bold">
                            {Number(subtotal.majorOriginal)
                              ? formatNumber(subtotal.majorOriginal)
                              : ""}
                          </td>
                          <td className="text-end fw-bold">
                            {Number(subtotal.majorAdjusted)
                              ? formatNumber(subtotal.majorAdjusted)
                              : ""}
                          </td>
                          <td className="text-end fw-bold">
                            {Number(subtotal.majorAmount)
                              ? formatNumber(subtotal.majorAmount)
                              : ""}
                          </td>
                          <td className="text-end border-start fw-bold">
                            {Number(subtotal.minorOriginal)
                              ? formatNumber(subtotal.minorOriginal)
                              : ""}
                          </td>
                          <td className="text-end fw-bold">
                            {Number(subtotal.minorAdjusted)
                              ? formatNumber(subtotal.minorAdjusted)
                              : ""}
                          </td>
                          <td className="text-end fw-bold">
                            {Number(subtotal.minorAmount)
                              ? formatNumber(subtotal.minorAmount)
                              : ""}
                          </td>
                          <td className="text-end border-start fw-bold">
                            {Number(subtotal.totalIncentive)
                              ? formatPeso(subtotal.totalIncentive)
                              : ""}
                          </td>
                          {isAdmin && (
                            <td className="text-end fw-bold">
                              {Number(subtotal.maxOrderIncentive)
                                ? formatPeso(subtotal.maxOrderIncentive)
                                : ""}
                            </td>
                          )}
                          <td></td>
                        </tr>
                      );
                      currentGroup = []; // Reset group after subtotal
                    }

                    return rows;
                  })
                  .flat()
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 17 : 16} className="text-center">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="table-active sticky-bottom">
              <tr>
                <td colSpan="5" className="text-end fw-bold">
                  Grand Total:
                </td>
                <td className="text-end fw-bold">
                  {Number(grandTotals.grandTotal)
                    ? formatPeso(grandTotals.grandTotal)
                    : ""}
                </td>
                <td className="text-center fw-bold">
                  {Number(grandTotals.quantity)
                    ? formatNumber(grandTotals.quantity)
                    : ""}
                </td>
                <td></td>
                <td className="text-end border-start fw-bold">
                  {Number(grandTotals.majorOriginal)
                    ? formatNumber(grandTotals.majorOriginal)
                    : ""}
                </td>
                <td className="text-end fw-bold">
                  {Number(grandTotals.majorAdjusted)
                    ? formatNumber(grandTotals.majorAdjusted)
                    : ""}
                </td>
                <td className="text-end fw-bold">
                  {Number(grandTotals.majorAmount)
                    ? formatNumber(grandTotals.majorAmount)
                    : ""}
                </td>
                <td className="text-end border-start fw-bold">
                  {Number(grandTotals.minorOriginal)
                    ? formatNumber(grandTotals.minorOriginal)
                    : ""}
                </td>
                <td className="text-end fw-bold">
                  {Number(grandTotals.minorAdjusted)
                    ? formatNumber(grandTotals.minorAdjusted)
                    : ""}
                </td>
                <td className="text-end fw-bold">
                  {Number(grandTotals.minorAmount)
                    ? formatNumber(grandTotals.minorAmount)
                    : ""}
                </td>
                <td className="text-end border-start fw-bold">
                  {Number(grandTotals.totalIncentive)
                    ? formatPeso(grandTotals.totalIncentive)
                    : ""}
                </td>
                {isAdmin && (
                  <td className="text-end fw-bold">
                    {Number(grandTotals.maxOrderIncentive)
                      ? formatPeso(grandTotals.maxOrderIncentive)
                      : ""}
                  </td>
                )}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportArtistIncentiveDetails;
