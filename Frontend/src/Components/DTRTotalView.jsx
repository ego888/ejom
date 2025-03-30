import React, { useState, useEffect } from "react";
import Button from "./UI/Button";

const DTRTotalView = ({ entries, batch }) => {
  const [showAllRows, setShowAllRows] = useState(false);
  const [totals, setTotals] = useState([]);

  useEffect(() => {
    calculateTotals();
  }, [entries]);

  const calculatePeriodHours = () => {
    const startDate = new Date(batch.periodStart);
    const endDate = new Date(batch.periodEnd);
    let totalDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (currentDate.getDay() !== 0) {
        totalDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return totalDays * 8;
  };

  const calculateTotals = () => {
    const periodHours = calculatePeriodHours();

    const employeeGroups = entries.reduce((groups, entry) => {
      if (entry.deleteRecord) return groups;

      const empKey = `${entry.empId}-${entry.empName}`;
      if (!groups[empKey]) {
        groups[empKey] = {
          empId: entry.empId,
          empName: entry.empName,
          entries: [],
          totals: {
            hours: 0,
            overtime: 0,
            sundayHours: 0,
            sundayOT: 0,
            nightDifferential: 0,
            periodHours,
            effectiveHours: 0,
            effectiveOT: 0,
          },
        };
      }

      groups[empKey].entries.push(entry);

      groups[empKey].totals.hours += Number(entry.hours || 0);
      groups[empKey].totals.overtime += Number(entry.overtime || 0);
      groups[empKey].totals.sundayHours += Number(entry.sundayHours || 0);
      groups[empKey].totals.sundayOT += Number(entry.sundayOT || 0);
      groups[empKey].totals.nightDifferential += Number(
        entry.nightDifferential || 0
      );

      return groups;
    }, {});

    Object.values(employeeGroups).forEach((employee) => {
      const totalWorkHours = employee.totals.hours + employee.totals.overtime;
      employee.totals.effectiveHours = Math.min(totalWorkHours, periodHours);
      employee.totals.effectiveOT = Math.max(0, totalWorkHours - periodHours);
    });

    const sortedTotals = Object.values(employeeGroups).sort((a, b) =>
      a.empId.localeCompare(b.empId)
    );

    setTotals(sortedTotals);
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    return timeString.substring(0, 5);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const formatNumber = (num) => {
    const value = Number(num || 0);
    return value > 0 ? value.toFixed(2) : "";
  };

  const grandTotal = totals.reduce(
    (total, employee) => ({
      hours: total.hours + employee.totals.hours,
      overtime: total.overtime + employee.totals.overtime,
      sundayHours: total.sundayHours + employee.totals.sundayHours,
      sundayOT: total.sundayOT + employee.totals.sundayOT,
      nightDifferential:
        total.nightDifferential + employee.totals.nightDifferential,
      effectiveHours: total.effectiveHours + employee.totals.effectiveHours,
      effectiveOT: total.effectiveOT + employee.totals.effectiveOT,
      periodHours: employee.totals.periodHours,
    }),
    {
      hours: 0,
      overtime: 0,
      sundayHours: 0,
      sundayOT: 0,
      nightDifferential: 0,
      effectiveHours: 0,
      effectiveOT: 0,
      periodHours: calculatePeriodHours(),
    }
  );

  const getDayColor = (day) => {
    switch (day?.toLowerCase()) {
      case "sun":
        return "#ff66cc";
      case "sat":
        return "#ffe0e0";
      case "mon":
        return "#e1f5fe";
      case "tue":
        return "#d0f8ce";
      case "wed":
        return "#fffde7";
      case "thu":
        return "#fce4ec";
      case "fri":
        return "#ffecb3";
      default:
        return "transparent";
    }
  };

  return (
    <div className="dtr-total-view">
      <div className="mb-3">
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="showAllRows"
            checked={showAllRows}
            onChange={(e) => setShowAllRows(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showAllRows">
            Show all entries
          </label>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover">
          <thead className="table-light">
            <tr>
              <th className="text-center">ID</th>
              <th className="text-center">Name</th>
              <th className="text-center">Effective Hrs</th>
              <th className="text-center">Effective OT</th>
              {showAllRows && (
                <>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                </>
              )}
              <th className="text-center">Hours</th>
              <th className="text-center">OT</th>
              <th className="text-center">Sun Hrs</th>
              <th className="text-center">Sun OT</th>
              <th className="text-center">Night Diff</th>
              {showAllRows && <th className="text-center">Remarks</th>}
            </tr>
          </thead>
          <tbody>
            {totals.map((employee) => (
              <React.Fragment key={employee.empId}>
                {showAllRows &&
                  employee.entries.map((entry) => {
                    const bgColor = getDayColor(entry.day);
                    const rowStyle = {
                      backgroundColor: bgColor,
                      textDecoration: entry.deleteRecord
                        ? "line-through"
                        : "none",
                    };

                    return (
                      <tr key={entry.id} style={rowStyle}>
                        <td style={rowStyle}>{entry.empId}</td>
                        <td style={rowStyle}>{entry.empName}</td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.effectiveHours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.effectiveOT)}
                        </td>
                        <td style={rowStyle}>{formatDate(entry.date)}</td>
                        <td style={rowStyle}>{entry.day}</td>
                        <td style={rowStyle}>{formatTime(entry.timeIn)}</td>
                        <td style={rowStyle}>{formatTime(entry.timeOut)}</td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.hours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.overtime)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.sundayHours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.sundayOT)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumber(entry.nightDifferential)}
                        </td>
                        {showAllRows && (
                          <td style={rowStyle}>{entry.remarks}</td>
                        )}
                      </tr>
                    );
                  })}
                <tr className="table-info">
                  <td>{employee.empId}</td>
                  <td>{employee.empName}</td>
                  <td className="text-end fw-bold">
                    {formatNumber(employee.totals.effectiveHours)}
                  </td>
                  <td className="text-end fw-bold">
                    {formatNumber(employee.totals.effectiveOT)}
                  </td>
                  {showAllRows && (
                    <td colSpan="4" className="text-center">
                      (Period Hrs: {employee.totals.periodHours})
                    </td>
                  )}
                  <td className="text-end">
                    {formatNumber(employee.totals.hours)}
                  </td>
                  <td className="text-end">
                    {formatNumber(employee.totals.overtime)}
                  </td>
                  <td className="text-end">
                    {formatNumber(employee.totals.sundayHours)}
                  </td>
                  <td className="text-end">
                    {formatNumber(employee.totals.sundayOT)}
                  </td>
                  <td className="text-end">
                    {formatNumber(employee.totals.nightDifferential)}
                  </td>
                  {showAllRows && <td></td>}
                </tr>
              </React.Fragment>
            ))}
            <tr className="table-dark">
              <td colSpan={showAllRows ? 6 : 2} className="text-center fw-bold">
                Grand Total (Period Hours: {grandTotal.periodHours})
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.hours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.overtime)}
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.sundayHours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.sundayOT)}
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.nightDifferential)}
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.effectiveHours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumber(grandTotal.effectiveOT)}
              </td>
              {showAllRows && <td></td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DTRTotalView;
