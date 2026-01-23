import React, { useState, useEffect } from "react";
import Button from "./UI/Button";
import {
  formatNumber,
  formatNumberZ,
  formatDate,
  formatTime,
} from "../utils/orderUtils";
import ExcelJS from "exceljs/dist/exceljs.min.js";

const DTRTotalView = ({ entries, batch, holidays }) => {
  const [showAllRows, setShowAllRows] = useState(false);
  const [totals, setTotals] = useState([]);

  useEffect(() => {
    calculateTotals();
  }, [entries, holidays]);

  const calculatePeriodHours = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    let currentDate = new Date(start);

    // Convert holidays to date strings for comparison
    const holidayDates = holidays.map((holiday) =>
      new Date(holiday.holidayDate).toDateString()
    );

    while (currentDate <= end) {
      // Skip Sundays and holidays
      if (
        currentDate.getDay() !== 0 &&
        !holidayDates.includes(currentDate.toDateString())
      ) {
        totalDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return totalDays * 8; // 8 hours per day
  };

  const calculateTotals = () => {
    const periodHours = calculatePeriodHours(
      batch.periodStart,
      batch.periodEnd
    );

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
            holidayHours: 0,
            holidayOT: 0,
            holidayType: "",
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
      groups[empKey].totals.holidayHours += Number(entry.holidayHours || 0);
      groups[empKey].totals.holidayOT += Number(entry.holidayOT || 0);
      groups[empKey].totals.holidayType = entry.holidayType || "";
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

  const grandTotal = totals.reduce(
    (total, employee) => ({
      hours: total.hours + employee.totals.hours,
      overtime: total.overtime + employee.totals.overtime,
      sundayHours: total.sundayHours + employee.totals.sundayHours,
      sundayOT: total.sundayOT + employee.totals.sundayOT,
      holidayHours: total.holidayHours + employee.totals.holidayHours,
      holidayOT: total.holidayOT + employee.totals.holidayOT,
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
      holidayHours: 0,
      holidayOT: 0,
      nightDifferential: 0,
      effectiveHours: 0,
      effectiveOT: 0,
      periodHours: calculatePeriodHours(batch.periodStart, batch.periodEnd),
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

  const getEffectiveHoursStyle = (effectiveHours) => {
    const totalPeriodHours = Number(grandTotal.periodHours ?? 0);
    const hoursValue = Number(effectiveHours ?? 0);

    if (!Number.isFinite(totalPeriodHours) || !Number.isFinite(hoursValue)) {
      return {};
    }

    if (hoursValue < totalPeriodHours - 16) {
      return { backgroundColor: "red" };
    }

    if (hoursValue < totalPeriodHours - 8) {
      return { backgroundColor: "orange" };
    }

    return {};
  };

  const formatNumber = (value) => {
    const num = Number(value);
    return num === 0 ? null : Number(num.toFixed(2));
  };

  const saveToXLS = async () => {
    const wb = new ExcelJS.Workbook();

    const addSheet = (name, columns, rows) => {
      const ws = wb.addWorksheet(name);
      ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 15 }));
      rows.forEach((row) => ws.addRow(row));
      columns
        .filter((c) => c.numFmt)
        .forEach((c) => {
          ws.getColumn(c.key).numFmt = c.numFmt;
        });
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          if (typeof cell.value === "string") cell.value = cell.value.trim();
        });
      });
      return ws;
    };

    const detailColumns = [
      { header: "ID", key: "empId", width: 12 },
      { header: "Name", key: "empName", width: 22 },
      { header: "Effective Hours", key: "effectiveHours", numFmt: "0.00" },
      { header: "Effective OT", key: "effectiveOT", numFmt: "0.00" },
      { header: "Date", key: "date", width: 12 },
      { header: "Day", key: "day", width: 8 },
      { header: "Time In", key: "timeIn", width: 12 },
      { header: "Time Out", key: "timeOut", width: 12 },
      { header: "Hours", key: "hours", numFmt: "0.00" },
      { header: "OT", key: "overtime", numFmt: "0.00" },
      { header: "Sun Hours", key: "sundayHours", numFmt: "0.00" },
      { header: "Sun OT", key: "sundayOT", numFmt: "0.00" },
      { header: "Holiday Hours", key: "holidayHours", numFmt: "0.00" },
      { header: "Holiday OT", key: "holidayOT", numFmt: "0.00" },
      { header: "Holiday Type", key: "holidayType", width: 16 },
      { header: "Night Diff", key: "nightDifferential", numFmt: "0.00" },
      { header: "Remarks", key: "remarks", width: 24 },
    ];

    const detailRows = totals.flatMap((employee) => {
      const rows = employee.entries.map((entry) => ({
        empId: entry.empId,
        empName: entry.empName,
        effectiveHours: entry.effectiveHours,
        effectiveOT: entry.effectiveOT,
        date: formatDate(entry.date),
        day: entry.day,
        timeIn: formatTime(entry.timeIn),
        timeOut: formatTime(entry.timeOut),
        hours: entry.hours,
        overtime: entry.overtime,
        sundayHours: entry.sundayHours,
        sundayOT: entry.sundayOT,
        holidayHours: entry.holidayHours,
        holidayOT: entry.holidayOT,
        holidayType: entry.holidayType,
        nightDifferential: entry.nightDifferential,
        remarks: entry.remarks,
      }));

      rows.push({
        empId: employee.empId,
        empName: employee.empName,
        effectiveHours: employee.totals.effectiveHours,
        effectiveOT: employee.totals.effectiveOT,
        date: "TOTAL",
        hours: employee.totals.hours,
        overtime: employee.totals.overtime,
        sundayHours: employee.totals.sundayHours,
        sundayOT: employee.totals.sundayOT,
        holidayHours: employee.totals.holidayHours,
        holidayOT: employee.totals.holidayOT,
        nightDifferential: employee.totals.nightDifferential,
        remarks: `Period Hours: ${employee.totals.periodHours}`,
      });

      return rows;
    });

    detailRows.push({
      empName: "GRAND TOTAL",
      effectiveHours: grandTotal.effectiveHours,
      effectiveOT: grandTotal.effectiveOT,
      hours: grandTotal.hours,
      overtime: grandTotal.overtime,
      sundayHours: grandTotal.sundayHours,
      sundayOT: grandTotal.sundayOT,
      holidayHours: grandTotal.holidayHours,
      holidayOT: grandTotal.holidayOT,
      nightDifferential: grandTotal.nightDifferential,
      remarks: `Period Hours: ${grandTotal.periodHours}`,
    });

    addSheet("DTR Details", detailColumns, detailRows);

    const summaryColumns = [
      { header: "ID", key: "empId", width: 12 },
      { header: "Name", key: "empName", width: 22 },
      { header: "Effective Hours", key: "effectiveHours", numFmt: "0.00" },
      { header: "Effective OT", key: "effectiveOT", numFmt: "0.00" },
      { header: "Hours", key: "hours", numFmt: "0.00" },
      { header: "OT", key: "overtime", numFmt: "0.00" },
      { header: "Sun Hours", key: "sundayHours", numFmt: "0.00" },
      { header: "Sun OT", key: "sundayOT", numFmt: "0.00" },
      { header: "Holiday Hours", key: "holidayHours", numFmt: "0.00" },
      { header: "Holiday OT", key: "holidayOT", numFmt: "0.00" },
      { header: "Night Diff", key: "nightDifferential", numFmt: "0.00" },
      { header: "Period Hours", key: "periodHours", numFmt: "0.00" },
    ];

    const summaryRows = totals.map((employee) => ({
      empId: employee.empId,
      empName: employee.empName,
      effectiveHours: employee.totals.effectiveHours,
      effectiveOT: employee.totals.effectiveOT,
      hours: employee.totals.hours,
      overtime: employee.totals.overtime,
      sundayHours: employee.totals.sundayHours,
      sundayOT: employee.totals.sundayOT,
      holidayHours: employee.totals.holidayHours,
      holidayOT: employee.totals.holidayOT,
      nightDifferential: employee.totals.nightDifferential,
      periodHours: employee.totals.periodHours,
    }));

    summaryRows.push({
      empName: "GRAND TOTAL",
      effectiveHours: grandTotal.effectiveHours,
      effectiveOT: grandTotal.effectiveOT,
      hours: grandTotal.hours,
      overtime: grandTotal.overtime,
      sundayHours: grandTotal.sundayHours,
      sundayOT: grandTotal.sundayOT,
      holidayHours: grandTotal.holidayHours,
      holidayOT: grandTotal.holidayOT,
      nightDifferential: grandTotal.nightDifferential,
      periodHours: grandTotal.periodHours,
    });

    addSheet("DTR Summary", summaryColumns, summaryRows);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${batch.batchName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dtr-total-view">
      <div className="mb-3">
        <div className="form-check d-flex gap-2">
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
          <Button variant="print" onClick={saveToXLS}>
            Save XLS
          </Button>
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
              <th className="text-center">Holiday Hrs</th>
              <th className="text-center">Holiday OT</th>
              <th className="text-center">Holiday Type</th>
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
                      <tr
                        key={entry.id}
                        style={rowStyle}
                        className={entry.holidayHours > 0 ? "holiday-row" : ""}
                      >
                        <td style={rowStyle}>{entry.empId}</td>
                        <td style={rowStyle}>{entry.empName}</td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.effectiveHours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.effectiveOT)}
                        </td>
                        <td style={rowStyle}>{formatDate(entry.date)}</td>
                        <td style={rowStyle}>{entry.day}</td>
                        <td style={rowStyle}>{formatTime(entry.timeIn)}</td>
                        <td style={rowStyle}>{formatTime(entry.timeOut)}</td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.hours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.overtime)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.sundayHours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.sundayOT)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.holidayHours)}
                        </td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.holidayOT)}
                        </td>
                        <td style={rowStyle}>{entry.holidayType}</td>
                        <td style={rowStyle} className="text-end">
                          {formatNumberZ(entry.nightDifferential)}
                        </td>
                        {showAllRows && (
                          <td style={rowStyle}>{entry.remarks}</td>
                        )}
                      </tr>
                    );
                  })}
                <tr
                  className="table-info"
                  style={{
                    borderTop: "2px solid #000",
                    borderBottom: "2px solid #000",
                  }}
                >
                  <td>{employee.empId}</td>
                  <td>{employee.empName}</td>
                  <td
                    className="text-end fw-bold"
                    style={getEffectiveHoursStyle(
                      employee.totals.effectiveHours
                    )}
                  >
                    {formatNumberZ(employee.totals.effectiveHours)}
                  </td>
                  <td className="text-end fw-bold">
                    {formatNumberZ(employee.totals.effectiveOT)}
                  </td>
                  {showAllRows && (
                    <td colSpan="4" className="text-center">
                      (Period Hrs: {employee.totals.periodHours})
                    </td>
                  )}
                  <td className="text-end">
                    {formatNumberZ(employee.totals.hours)}
                  </td>
                  <td className="text-end">
                    {formatNumberZ(employee.totals.overtime)}
                  </td>
                  <td className="text-end">
                    {formatNumberZ(employee.totals.sundayHours)}
                  </td>
                  <td className="text-end">
                    {formatNumberZ(employee.totals.sundayOT)}
                  </td>
                  <td className="text-end">
                    {formatNumberZ(employee.totals.holidayHours)}
                  </td>
                  <td className="text-end">
                    {formatNumberZ(employee.totals.holidayOT)}
                  </td>
                  <td className="text-end">
                    {/* {formatNumber(employee.totals.holidayType)} */}
                  </td>
                  <td className="text-end">
                    {formatNumberZ(employee.totals.nightDifferential)}
                  </td>
                  {showAllRows && <td></td>}
                </tr>
              </React.Fragment>
            ))}
            <tr className="table-dark">
              <td colSpan={showAllRows ? 2 : 2} className="text-center fw-bold">
                Grand Total (Period Hours: {grandTotal.periodHours})
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.effectiveHours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.effectiveOT)}
              </td>
              {showAllRows && <td colSpan={4} className="text-center"></td>}

              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.hours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.overtime)}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.sundayHours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.sundayOT)}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.holidayHours)}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.holidayOT)}
              </td>
              <td className="text-end fw-bold">
                {/* {formatNumber(grandTotal.holidayType)} */}
              </td>
              <td className="text-end fw-bold">
                {formatNumberZ(grandTotal.nightDifferential)}
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
