import React from "react";
import PropTypes from "prop-types";

const YearMonthSelector = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}) => {
  // Generate years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    years.push(year);
  }

  // Generate months
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="d-flex gap-2 align-items-center">
      <div className="d-flex flex-column">
        <label className="form-label small text-muted mb-1">Year</label>
        <select
          className="form-select form-select-sm"
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          style={{ minWidth: "80px" }}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="d-flex flex-column">
        <label className="form-label small text-muted mb-1">Month</label>
        <select
          className="form-select form-select-sm"
          value={selectedMonth}
          onChange={(e) => onMonthChange(parseInt(e.target.value))}
          style={{ minWidth: "120px" }}
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

YearMonthSelector.propTypes = {
  selectedYear: PropTypes.number.isRequired,
  selectedMonth: PropTypes.number.isRequired,
  onYearChange: PropTypes.func.isRequired,
  onMonthChange: PropTypes.func.isRequired,
};

export default YearMonthSelector;
