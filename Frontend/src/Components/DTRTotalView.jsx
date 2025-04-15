import React, { useState, useEffect } from "react";
import Button from "./UI/Button";
import {
  formatNumber,
  formatNumberZ,
  formatDate,
  formatTime,
} from "../utils/orderUtils";
import * as XLSX from "xlsx";

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

  const formatNumber = (value) => {
    const num = Number(value);
    return num === 0 ? null : Number(num.toFixed(2));
  };

  const saveToXLS = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Define number format for 2 decimal places, hiding zeros
    const numberFormat = "0.00;-0.00;;@";

    if (showAllRows) {
      // Export detailed view
      const detailedData = totals.flatMap((employee) => {
        const employeeRows = employee.entries.map((entry) => ({
          ID: entry.empId,
          Name: entry.empName,
          "Effective Hours": entry.effectiveHours,
          "Effective OT": entry.effectiveOT,
          Date: formatDate(entry.date),
          Day: entry.day,
          "Time In": formatTime(entry.timeIn),
          "Time Out": formatTime(entry.timeOut),
          Hours: entry.hours,
          OT: entry.overtime,
          "Sun Hours": entry.sundayHours,
          "Sun OT": entry.sundayOT,
          "Holiday Hours": entry.holidayHours,
          "Holiday OT": entry.holidayOT,
          "Holiday Type": entry.holidayType,
          "Night Diff": entry.nightDifferential,
          Remarks: entry.remarks,
        }));

        // Add employee totals row
        employeeRows.push({
          ID: employee.empId,
          Name: employee.empName,
          "Effective Hours": employee.totals.effectiveHours,
          "Effective OT": employee.totals.effectiveOT,
          Date: "TOTAL",
          Day: "",
          "Time In": "",
          "Time Out": "",
          Hours: employee.totals.hours,
          OT: employee.totals.overtime,
          "Sun Hours": employee.totals.sundayHours,
          "Sun OT": employee.totals.sundayOT,
          "Holiday Hours": employee.totals.holidayHours,
          "Holiday OT": employee.totals.holidayOT,
          "Holiday Type": "",
          "Night Diff": employee.totals.nightDifferential,
          Remarks: `Period Hours: ${employee.totals.periodHours}`,
        });

        return employeeRows;
      });

      // Add grand total row
      detailedData.push({
        ID: "",
        Name: "GRAND TOTAL",
        "Effective Hours": grandTotal.effectiveHours,
        "Effective OT": grandTotal.effectiveOT,
        Date: "",
        Day: "",
        "Time In": "",
        "Time Out": "",
        Hours: grandTotal.hours,
        OT: grandTotal.overtime,
        "Sun Hours": grandTotal.sundayHours,
        "Sun OT": grandTotal.sundayOT,
        "Holiday Hours": grandTotal.holidayHours,
        "Holiday OT": grandTotal.holidayOT,
        "Holiday Type": "",
        "Night Diff": grandTotal.nightDifferential,
        Remarks: `Period Hours: ${grandTotal.periodHours}`,
      });

      const ws = XLSX.utils.json_to_sheet(detailedData);

      // Set number format for numeric columns
      const numericColumns = ["C", "D", "H", "I", "J", "K", "L", "M", "O"];
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const col = XLSX.utils.encode_col(C);
        if (numericColumns.includes(col)) {
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (ws[cell_ref]) {
              ws[cell_ref].z = numberFormat;
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "DTR Details");
    } else {
      // Export summary view
      const summaryData = totals.map((employee) => ({
        ID: employee.empId,
        Name: employee.empName,
        "Effective Hours": employee.totals.effectiveHours,
        "Effective OT": employee.totals.effectiveOT,
        Hours: employee.totals.hours,
        OT: employee.totals.overtime,
        "Sun Hours": employee.totals.sundayHours,
        "Sun OT": employee.totals.sundayOT,
        "Holiday Hours": employee.totals.holidayHours,
        "Holiday OT": employee.totals.holidayOT,
        "Night Diff": employee.totals.nightDifferential,
        "Period Hours": employee.totals.periodHours,
      }));

      // Add grand total row
      summaryData.push({
        ID: "",
        Name: "GRAND TOTAL",
        "Effective Hours": grandTotal.effectiveHours,
        "Effective OT": grandTotal.effectiveOT,
        Hours: grandTotal.hours,
        OT: grandTotal.overtime,
        "Sun Hours": grandTotal.sundayHours,
        "Sun OT": grandTotal.sundayOT,
        "Holiday Hours": grandTotal.holidayHours,
        "Holiday OT": grandTotal.holidayOT,
        "Night Diff": grandTotal.nightDifferential,
        "Period Hours": grandTotal.periodHours,
      });

      const ws = XLSX.utils.json_to_sheet(summaryData);

      // Set number format for numeric columns
      const numericColumns = ["C", "D", "E", "F", "G", "H", "I", "J", "K"];
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const col = XLSX.utils.encode_col(C);
        if (numericColumns.includes(col)) {
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (ws[cell_ref]) {
              ws[cell_ref].z = numberFormat;
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "DTR Summary");
    }

    // Generate filename with batch name and date
    const filename = `${batch.batchName}_${
      new Date().toISOString().split("T")[0]
    }${!showAllRows ? "S" : ""}.xlsx`;

    // Save the file
    XLSX.writeFile(wb, filename);
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
                  <td className="text-end fw-bold">
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
