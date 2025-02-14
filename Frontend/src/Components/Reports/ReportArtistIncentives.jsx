import React, { useState, useEffect } from "react";
import { formatNumber } from "../../utils/orderUtils";
import "./ReportSalesSummary.css";
import axios from "axios";
import { ServerIP } from "../../config";

const ReportArtistIncentives = ({ data }) => {
  const [incentiveSettings, setIncentiveSettings] = useState({
    major: data.rates?.major || 0,
    minor: data.rates?.minor || 0,
    maxArtistIncentive: data.rates?.ArtistMaxPercent || 0,
  });

  // Update settings when data.rates changes
  useEffect(() => {
    if (data.rates) {
      setIncentiveSettings({
        major: data.rates.major || 0,
        minor: data.rates.minor || 0,
        maxArtistIncentive: data.rates.ArtistMaxPercent || 0,
      });
    }
  }, [data.rates]);

  console.log("ReportArtistIncentives Props Data:", data);

  // Update to use data.summary instead of data directly
  const totals = (data.summary || []).reduce(
    (acc, curr) => ({
      totalOrders: acc.totalOrders + (curr.orderCount || 0),
      totalAmount: acc.totalAmount + (curr.totalAmount || 0),
      totalPaid: acc.totalPaid + (curr.amountPaid || 0),
      totalMajor: acc.totalMajor + (curr.major || 0),
      totalMinor: acc.totalMinor + (curr.minor || 0),
      totalMajorAmount: acc.totalMajorAmount + (curr.majorAmount || 0),
      totalMinorAmount: acc.totalMinorAmount + (curr.minorAmount || 0),
      totalIncentive: acc.totalIncentive + (curr.totalIncentive || 0),
    }),
    {
      totalOrders: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalMajor: 0,
      totalMinor: 0,
      totalMajorAmount: 0,
      totalMinorAmount: 0,
      totalIncentive: 0,
    }
  );

  return (
    <div className="report-summary-container">
      <h4 className="report-title">Artist Incentive Summary Report</h4>
      <div className="mb-3 text-end">
        <small className="text-muted">
          Current Rates - Major: ₱{formatNumber(incentiveSettings.major)} |
          Minor: ₱{formatNumber(incentiveSettings.minor)} | Max: ₱
          {formatNumber(incentiveSettings.maxArtistIncentive)}
        </small>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-active">
            <tr>
              <th>Count</th>
              <th>Artist</th>
              <th colSpan="2">Major</th>
              <th colSpan="2">Minor</th>
              <th>Total</th>
              <th className="text-end">Total Amount</th>
              <th className="text-end">Amount Paid</th>
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th>Count</th>
              <th>Amount</th>
              <th>Count</th>
              <th>Amount</th>
              <th> Incentive</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.summary && data.summary.length > 0 ? (
              data.summary.map((item, index) => (
                <tr key={index}>
                  <td className="text-center">{item.orderCount}</td>
                  <td>{item.category || "Unknown"}</td>
                  <td className="text-center">{item.major || "-"}</td>
                  <td className="text-end">
                    ₱{formatNumber(item.majorAmount)}
                  </td>
                  <td className="text-center">{item.minor || "-"}</td>
                  <td className="text-end">
                    ₱{formatNumber(item.minorAmount)}
                  </td>
                  <td className="text-end">
                    ₱{formatNumber(item.totalIncentive)}
                  </td>
                  <td className="text-end">
                    ₱{formatNumber(item.totalAmount)}
                  </td>
                  <td className="text-end">₱{formatNumber(item.amountPaid)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="table-active">
              <td colSpan={2}>{totals.totalOrders} Total Orders</td>
              <td className="text-center">{totals.totalMajor}</td>
              <td className="text-end">
                ₱{formatNumber(totals.totalMajorAmount)}
              </td>
              <td className="text-center">{totals.totalMinor}</td>
              <td className="text-end">
                ₱{formatNumber(totals.totalMinorAmount)}
              </td>
              <td className="text-end">
                ₱
                {formatNumber(
                  totals.totalMajorAmount + totals.totalMinorAmount
                )}
              </td>
              <td className="text-end">₱{formatNumber(totals.totalAmount)}</td>
              <td className="text-end">₱{formatNumber(totals.totalPaid)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReportArtistIncentives;
