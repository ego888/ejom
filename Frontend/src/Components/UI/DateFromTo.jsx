import React, { useState, useEffect } from "react";
import "./DateFromTo.css";

const DateFromTo = ({ onDateChange, className }) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12);

    setDateFrom(firstDay.toISOString().slice(0, 10));
    setDateTo(lastDay.toISOString().slice(0, 10));

    // Notify parent of initial dates
    onDateChange?.(
      firstDay.toISOString().slice(0, 10),
      lastDay.toISOString().slice(0, 10)
    );
  }, []);

  // Date adjustment functions
  const adjustFromDate = (months) => {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(12);
    fromDate.setMonth(fromDate.getMonth() + months);
    const newDate = fromDate.toISOString().slice(0, 10);
    setDateFrom(newDate);
    onDateChange?.(newDate, dateTo);
  };

  const adjustToDate = (months) => {
    let toDate = new Date(dateTo);
    toDate.setHours(12);

    const currentYear = toDate.getFullYear();
    const currentMonth = toDate.getMonth();
    const currentDate = toDate.getDate();

    const lastDayOfCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
      12
    ).getDate();
    const isLastDayOfMonth = currentDate === lastDayOfCurrentMonth;

    let newMonth = currentMonth + months;
    let newYear = currentYear;

    while (newMonth > 11) {
      newMonth -= 12;
      newYear++;
    }
    while (newMonth < 0) {
      newMonth += 12;
      newYear--;
    }

    if (isLastDayOfMonth) {
      const lastDayOfNewMonth = new Date(
        newYear,
        newMonth + 1,
        0,
        12
      ).getDate();
      toDate = new Date(newYear, newMonth, lastDayOfNewMonth, 12);
    } else {
      toDate = new Date(newYear, newMonth, currentDate, 12);
    }

    const newDate = toDate.toISOString().slice(0, 10);
    setDateTo(newDate);
    onDateChange?.(dateFrom, newDate);
  };

  const adjustBothDates = (months) => {
    adjustFromDate(months);
    adjustToDate(months);
  };

  const adjustFromYear = (years) => {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(12);
    fromDate.setFullYear(fromDate.getFullYear() + years);
    const newDate = fromDate.toISOString().slice(0, 10);
    setDateFrom(newDate);
    onDateChange?.(newDate, dateTo);
  };

  const adjustToYear = (years) => {
    let toDate = new Date(dateTo);
    toDate.setHours(12);

    const currentYear = toDate.getFullYear();
    const currentMonth = toDate.getMonth();
    const currentDate = toDate.getDate();

    const lastDayOfCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
      12
    ).getDate();
    const isLastDayOfMonth = currentDate === lastDayOfCurrentMonth;

    const newYear = currentYear + years;

    if (isLastDayOfMonth) {
      const lastDayOfNewMonth = new Date(
        newYear,
        currentMonth + 1,
        0,
        12
      ).getDate();
      toDate = new Date(newYear, currentMonth, lastDayOfNewMonth, 12);
    } else {
      toDate = new Date(newYear, currentMonth, currentDate, 12);
    }

    const newDate = toDate.toISOString().slice(0, 10);
    setDateTo(newDate);
    onDateChange?.(dateFrom, newDate);
  };

  const adjustBothYears = (years) => {
    adjustFromYear(years);
    adjustToYear(years);
  };

  const handleFromDateChange = (e) => {
    setDateFrom(e.target.value);
    onDateChange?.(e.target.value, dateTo);
  };

  const handleToDateChange = (e) => {
    setDateTo(e.target.value);
    onDateChange?.(dateFrom, e.target.value);
  };

  return (
    <div className={`date-range-container ${className || ""}`}>
      {/* From Date Row */}
      <div className="date-control mb-3">
        <label htmlFor="dateFrom" className="form-label">
          Date From
        </label>
        <div className="date-input-group">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustFromYear(-1)}
            title="Previous Year (From)"
          >
            <i className="bi bi-calendar-minus-fill"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustFromDate(-1)}
            title="Previous Month (From)"
          >
            <i className="bi bi-calendar-minus"></i>
          </button>
          <input
            type="date"
            className="form-control"
            id="dateFrom"
            value={dateFrom}
            onChange={handleFromDateChange}
          />
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustFromDate(1)}
            title="Next Month (From)"
          >
            <i className="bi bi-calendar-plus"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustFromYear(1)}
            title="Next Year (From)"
          >
            <i className="bi bi-calendar-plus-fill"></i>
          </button>
        </div>
      </div>

      {/* Both Dates Row */}
      <div className="date-control mb-3">
        <div className="date-input-group">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustBothYears(-1)}
            title="Previous Year (Both)"
          >
            <i className="bi bi-calendar-minus-fill"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustBothDates(-1)}
            title="Previous Month (Both)"
          >
            <i className="bi bi-calendar-minus"></i>
          </button>
          <label htmlFor="dateTo" className="form-label">
            Date To
          </label>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustBothDates(1)}
            title="Next Month (Both)"
          >
            <i className="bi bi-calendar-plus"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustBothYears(1)}
            title="Next Year (Both)"
          >
            <i className="bi bi-calendar-plus-fill"></i>
          </button>
        </div>
      </div>

      {/* To Date Row */}
      <div className="date-control mb-3">
        <div className="date-input-group">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustToYear(-1)}
            title="Previous Year (To)"
          >
            <i className="bi bi-calendar-minus-fill"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustToDate(-1)}
            title="Previous Month (To)"
          >
            <i className="bi bi-calendar-minus"></i>
          </button>
          <input
            type="date"
            className="form-control"
            id="dateTo"
            value={dateTo}
            onChange={handleToDateChange}
          />
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustToDate(1)}
            title="Next Month (To)"
          >
            <i className="bi bi-calendar-plus"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => adjustToYear(1)}
            title="Next Year (To)"
          >
            <i className="bi bi-calendar-plus-fill"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateFromTo;
