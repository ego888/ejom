import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import "./DTRHolidays.css";

const DTRHolidays = () => {
  const [date, setDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [holidayType, setHolidayType] = useState("Regular");

  useEffect(() => {
    fetchHolidays();
  }, []); // Only fetch once when component mounts

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/holidays`);

      if (response.data.Status) {
        // Convert UTC dates to local dates and format them as YYYY-MM-DD
        const formattedHolidays = (response.data.Holidays || []).map(
          (holiday) => ({
            ...holiday,
            holidayDate: new Date(holiday.holidayDate)
              .toISOString()
              .split("T")[0],
          })
        );
        setHolidays(formattedHolidays);
      } else {
        setError(response.data.Error || "Failed to fetch holidays");
      }
    } catch (err) {
      setError("Failed to fetch holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    setSelectedDate(dateStr);
    handleAddHoliday(dateStr); // Pass the dateStr directly
  };

  const handleAddHoliday = async (dateToUse) => {
    // Use the passed date or fall back to selectedDate
    const dateToProcess = dateToUse || selectedDate;
    if (!dateToProcess || !holidayType) return;

    try {
      setLoading(true);
      const response = await axios.post(`${ServerIP}/auth/dtr/add-holiday`, {
        holidayDate: dateToProcess,
        holidayType: holidayType,
      });

      if (response.data.Status) {
        // Refresh holidays list
        await fetchHolidays();
        setShowModal(false);
      } else {
        setError(response.data.Error || "Failed to add holiday");
      }
    } catch (err) {
      setError("Failed to add holiday");
    } finally {
      setLoading(false);
    }
  };

  const isHoliday = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return holidays.find((h) => h.holidayDate === dateStr);
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const holiday = isHoliday(date);
      if (holiday) {
        return `holiday ${holiday.holidayType.toLowerCase()}`;
      }
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const holiday = isHoliday(date);
      if (holiday) {
        return (
          <div className="holiday-tooltip" title={holiday.description}>
            <span className="holiday-dot"></span>
          </div>
        );
      }
    }
    return null;
  };

  if (loading && !showModal) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="dtr-holidays">
      <Calendar
        onChange={setDate}
        value={date}
        tileClassName={tileClassName}
        tileContent={tileContent}
        className="custom-calendar"
        locale="en-US"
        onClickDay={handleDateClick}
      />
      <div className="holiday-legend mt-3">
        <div className="legend-item">
          <div className="holiday-indicator regular"></div>
          <Button
            variant="tooltip"
            className={holidayType === "Regular" ? "active" : ""}
            onClick={() => setHolidayType("Regular")}
            data-type="Regular"
          >
            Regular
          </Button>
          <div className="holiday-indicator special"></div>
          <Button
            variant="tooltip"
            className={holidayType === "Special" ? "active" : ""}
            onClick={() => setHolidayType("Special")}
            data-type="Special"
          >
            Special
          </Button>
        </div>
      </div>

      {/* <Modal
        variant="tooltip"
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setHolidayType("Regular");
        }}
        title="Add Holiday"
      >
        <div className="add-holiday-form">
          <div className="d-flex gap-3 justify-content-center">
            <Button
              variant="tooltip"
              className={holidayType === "Regular" ? "active" : ""}
              onClick={() => setHolidayType("Regular")}
            >
              Regular
            </Button>
            <Button
              variant="tooltip"
              className={holidayType === "Special" ? "active" : ""}
              onClick={() => setHolidayType("Special")}
            >
              Special
            </Button>
          </div>
        </div>
      </Modal> */}
    </div>
  );
};

export default DTRHolidays;
