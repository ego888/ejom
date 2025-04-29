import React, { useState, useEffect, useRef } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import ModalAlert from "./UI/ModalAlert";
import Modal from "react-bootstrap/Modal";
import DTRTotalView from "./DTRTotalView";
import "./DTRBatchView.css";

const getDayColor = (day) => {
  switch (day?.toLowerCase()) {
    // case "sun":
    //   return "#ffebee"; // Light red for Sunday
    // case "sat":
    //   return "#e3f2fd"; // Light blue for Saturday
    // case "mon":
    //   return "#f1f8e9"; // Light green for Monday
    // case "tue":
    //   return "#fff3e0"; // Light orange for Tuesday
    // case "wed":
    //   return "#f3e5f5"; // Light purple for Wednesday
    // case "thu":
    //   return "#e8f5e9"; // Mint green for Thursday
    // case "fri":
    //   return "#fff8e1"; // Light yellow for Friday
    // default:
    //   return "transparent";
    case "sun":
      return "#ff66cc"; // Light red for Sunday
    case "sat":
      return "#ffe0e0"; // Light blue for Saturday
    case "mon":
      return "#e1f5fe"; // Light green for Monday
    case "tue":
      return "#d0f8ce"; // Light orange for Tuesday
    case "wed":
      return "#fffde7"; // Light purple for Wednesday
    case "thu":
      return "#fce4ec"; // Mint green for Thursday
    case "fri":
      return "#ffecb3"; // Light yellow for Friday
    default:
      return "transparent";
  }
};

const formatTime = (timeString) => {
  if (!timeString) return "-";
  return timeString.substring(0, 5); // Takes only HH:MM from HH:MM:SS
};

const DTRBatchView = ({ batch, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "empId",
    direction: "ascending",
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [analyzedEntries, setAnalyzedEntries] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hideDeleted, setHideDeleted] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timeType, setTimeType] = useState(null); // 'in' or 'out'
  const [defaultTime, setDefaultTime] = useState("");
  const [showFloatingTime, setShowFloatingTime] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({ x: 0, y: 0 });
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [empId, setEmpId] = useState("");
  const [empName, setEmpName] = useState("");
  const [date, setDate] = useState("");
  const [timeIn, setTimeIn] = useState("08:00");
  const [timeOut, setTimeOut] = useState("17:00");
  const [referenceHours, setReferenceHours] = useState("00");
  const [referenceMinutes, setReferenceMinutes] = useState("00");
  const [rightClickTarget, setRightClickTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("entries"); // 'entries' or 'totals'
  const [showEditPeriodModal, setShowEditPeriodModal] = useState(false);
  const [showDateContextMenu, setShowDateContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [contextMenuEntry, setContextMenuEntry] = useState(null);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const contextMenuRef = useRef(null);
  const [holidays, setHolidays] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    variant: "success",
  });

  useEffect(() => {
    fetchHolidays();
    fetchEntries();
  }, [batch]);

  useEffect(() => {
    // Load hide deleted preference from localStorage
    const savedHideDeleted = localStorage.getItem("dtrHideDeleted");
    if (savedHideDeleted !== null) {
      setHideDeleted(savedHideDeleted === "true");
    }

    // Load active tab preference from localStorage
    const savedActiveTab = localStorage.getItem("dtrActiveTab");
    if (savedActiveTab) {
      setActiveTab(savedActiveTab);
    }
  }, []);

  // Save hideDeleted preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("dtrHideDeleted", hideDeleted);
  }, [hideDeleted]);

  // Save activeTab preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("dtrActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleGlobalRightClick = (e) => {
      if (e.target.closest(".table-responsive")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleGlobalRightClick);
    return () => {
      document.removeEventListener("contextmenu", handleGlobalRightClick);
    };
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/holidays`);
      if (response.data.Status) {
        setHolidays(response.data.Holidays);
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${ServerIP}/auth/dtr/export/${batch.id}`
      );
      if (response.data.Status) {
        setEntries(response.data.Entries);
      }
    } catch (err) {
      setError("Failed to load DTR entries");
      console.error("Error fetching entries:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedEntries = React.useMemo(() => {
    if (!entries) return [];

    // Filter by search term and hideDeleted if any
    let filteredEntries = entries;
    if (searchTerm.trim() || hideDeleted) {
      filteredEntries = entries.filter((entry) => {
        const matchesSearch =
          !searchTerm.trim() ||
          entry.empId
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.date.includes(searchTerm) ||
          (entry.state &&
            entry.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (entry.remarks &&
            entry.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (entry.day &&
            entry.day.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (entry.timeIn &&
            entry.timeIn.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (entry.timeOut &&
            entry.timeOut.toLowerCase().includes(searchTerm.toLowerCase()));

        const notDeleted = !hideDeleted || !entry.deleteRecord;

        return matchesSearch && notDeleted;
      });
    }

    // Sort filtered entries
    const sortableEntries = [...filteredEntries];
    if (sortConfig.key) {
      sortableEntries.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;

        if (typeof a[sortConfig.key] === "string") {
          if (sortConfig.direction === "ascending") {
            return a[sortConfig.key].localeCompare(b[sortConfig.key]);
          } else {
            return b[sortConfig.key].localeCompare(a[sortConfig.key]);
          }
        } else {
          if (sortConfig.direction === "ascending") {
            return a[sortConfig.key] - b[sortConfig.key];
          } else {
            return b[sortConfig.key] - a[sortConfig.key];
          }
        }
      });
    }
    return sortableEntries;
  }, [entries, sortConfig, searchTerm, hideDeleted]);

  const handleReset = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all entries? This cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${ServerIP}/auth/dtr/reset-entries/${batch.id}`
      );
      if (response.data.Status) {
        await fetchEntries();
      } else {
        setError(response.data.Error || "Failed to reset entries");
      }
    } catch (error) {
      console.error("Error resetting entries:", error);
      setError("Failed to reset entries. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? " ↑" : " ↓";
    }
    return "";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      for (let i = 0; i < entries.length - 1; i++) {
        // Get current record
        let current = entries[i];

        // Skip if deleted or already processed
        if (current.deleteRecord || current.processed) {
          continue;
        }

        // Find next valid record
        let nextIndex = i + 1;
        let next = entries[nextIndex];
        while (nextIndex < entries.length && next.deleteRecord) {
          nextIndex++;
          next = entries[nextIndex];
        }

        // If no valid next record found or next record is for different employee
        if (!next || next.empId !== current.empId) {
          // Process current record based on time of day
          const [hours] = current.time.split(":").map(Number);

          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...current,
                dateOut: current.date,
                timeIn: hours < 12 ? current.time : null,
                timeOut: hours >= 12 ? current.time : null,
                editedIn: hours < 12 ? 0 : 1,
                editedOut: hours < 12 ? 1 : 0,
                processed: 0,
                remarks: "LACK1, " + (current.remarks || ""),
                deleteRecord: 0,
              },
            ],
          });

          if (!next) break;
          continue;
        }

        // Rest of the existing logic for same employee
        const currentDate = new Date(current.date);
        const nextDate = new Date(next.date);
        const isNextDay =
          nextDate.getTime() - currentDate.getTime() === 24 * 60 * 60 * 1000;

        if (isNextDay) {
          // Next day logic
          const [hours] = next.time.split(":").map(Number);

          if (hours < 5) {
            // Before 5 AM - Auto process as timeout
            await axios.post(
              `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
              {
                entries: [
                  {
                    ...current,
                    dateOut: next.date,
                    timeIn: current.time,
                    timeOut: next.time,
                    processed: 1,
                    remarks: "PROC1, " + (current.remarks || ""),
                    deleteRecord: 0,
                  },
                  {
                    ...next,
                    processed: 1,
                    deleteRecord: 1,
                  },
                ],
              }
            );
            i = nextIndex; // Skip next record
          } else if (hours >= 5 && hours < 7) {
            // Between 5-7 AM - Ask for confirmation
            setCurrentIndex(i);
            setCurrentEntry({ current, next });
            setShowConfirmModal(true);
            return; // Exit and wait for user input
          } else {
            const [hours] = current.time.split(":").map(Number);
            // After 7 AM - Process as new time-in
            await axios.post(
              `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
              {
                entries: [
                  {
                    ...current,
                    dateOut: current.date,
                    timeIn: hours > 12 ? null : current.time,
                    timeOut: hours > 12 ? current.time : null,
                    editedIn: hours > 12 ? 1 : 0,
                    editedOut: hours > 12 ? 0 : 1,
                    processed: 0,
                    remarks: "LACK2, " + (current.remarks || ""),
                    deleteRecord: 0,
                  },
                ],
              }
            );
          }
        } else if (current.date === next.date) {
          // Same day - Process as time-in/time-out pair
          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...current,
                dateOut: next.date,
                timeIn: current.time,
                timeOut: next.time,
                processed: 1,
                remarks: "PROC2, " + (current.remarks || ""),
                deleteRecord: 0,
              },
              {
                ...next,
                processed: 1,
                deleteRecord: 1,
              },
            ],
          });
          i = nextIndex; // Skip next record
        }
      }

      // Handle the very last record if it exists and isn't processed
      if (entries.length > 0) {
        const lastRecord = entries[entries.length - 1];
        if (!lastRecord.deleteRecord && !lastRecord.processed) {
          const [hours] = lastRecord.time.split(":").map(Number);

          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...lastRecord,
                dateOut: lastRecord.date,
                timeIn: hours < 12 ? lastRecord.time : null,
                timeOut: hours >= 12 ? lastRecord.time : null,
                editedIn: hours < 12 ? 0 : 1,
                editedOut: hours < 12 ? 1 : 0,
                processed: 0,
                remarks: "LACK3, " + (lastRecord.remarks || ""),
                deleteRecord: 0,
              },
            ],
          });
        }
      }

      // Final pass: Check all unprocessed records
      const response = await axios.get(
        `${ServerIP}/auth/dtr/export/${batch.id}`
      );
      if (response.data.Status) {
        const currentEntries = response.data.Entries;
        const unprocessedEntries = currentEntries.filter(
          (entry) =>
            entry.processed === 0 &&
            !entry.deleteRecord &&
            !entry.timeIn &&
            !entry.timeOut
        );

        if (unprocessedEntries.length > 0) {
          for (const entry of unprocessedEntries) {
            const [hours] = entry.time.split(":").map(Number);

            await axios.post(
              `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
              {
                entries: [
                  {
                    id: entry.id,
                    ...entry,
                    dateOut: entry.date,
                    timeIn: hours < 12 ? entry.time : null,
                    timeOut: hours >= 12 ? entry.time : null,
                    editedIn: hours < 12 ? 0 : 1,
                    editedOut: hours < 12 ? 1 : 0,
                    processed: 0,
                    remarks: "LACK4, " + (entry.remarks || ""),
                    deleteRecord: 0,
                  },
                ],
              }
            );
          }
        }
      }

      // Final refresh after all processing is complete
      await fetchEntries();
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error in analyze process:", error);
      setError("Failed to complete analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTime = async (isTimeOut) => {
    if (!currentEntry) return;
    setLoading(true);

    try {
      if (isTimeOut) {
        // Process as timeout for previous day - process both records
        const updateBatch = [
          {
            ...currentEntry.current,
            dateOut: currentEntry.next.date,
            timeIn: currentEntry.current.time,
            timeOut: currentEntry.next.time,
            processed: 1,
            remarks: "PROC3, " + (currentEntry.current.remarks || ""),
            deleteRecord: 0,
          },
          {
            ...currentEntry.next,
            processed: 1,
            deleteRecord: 1,
          },
        ];

        await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
          entries: updateBatch,
        });

        // Increment index by 2 since we processed both records
        setCurrentIndex(currentIndex + 2);
      } else {
        // Process only the current record as a time-in
        const updateBatch = [
          {
            ...currentEntry.current,
            timeIn: currentEntry.current.time,
            processed: 1,
            remarks: "PROC4, " + (currentEntry.current.remarks || ""),
            deleteRecord: 0,
          },
        ];

        await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
          entries: updateBatch,
        });

        // Increment index by 1 since we only processed the current record
        setCurrentIndex(currentIndex + 1);
      }

      // Refresh the data
      await fetchEntries();

      // Reset modal state
      setShowConfirmModal(false);
      setCurrentEntry(null);
      setLoading(false);

      // Continue analyzing from the next record
      handleAnalyze();
    } catch (error) {
      console.error("Error updating entries:", error);
      setError("Failed to update entries. Please try again.");
      setLoading(false);
      setShowConfirmModal(false);
      setCurrentEntry(null);
    }
  };

  const handleDeleteRepeat = async () => {
    setLoading(true);
    setError(null);

    try {
      // Go through records one by one
      for (let i = 0; i < entries.length - 1; i++) {
        const current = entries[i];

        // Skip if already deleted
        if (current.deleteRecord) {
          continue;
        }

        // Check if date is within batch period
        const currentDate = new Date(current.date);
        const batchStartDate = new Date(batch.periodStart);
        const batchEndDate = new Date(batch.periodEnd);

        if (currentDate < batchStartDate || currentDate > batchEndDate) {
          try {
            await axios.post(
              `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
              {
                entries: [
                  {
                    ...current,
                    processed: 0,
                    remarks: "OUTSIDE PERIOD " + (current.remarks || ""),
                    deleteRecord: 1,
                  },
                ],
              }
            );
          } catch (error) {
            console.error("Error updating entry:", error);
          }
          continue;
        }

        // Convert current time to minutes for comparison
        const [currentHours, currentMinutes] = current.time
          .split(":")
          .map(Number);
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        // Check subsequent records
        for (let j = i + 1; j < entries.length; j++) {
          const next = entries[j];

          // Skip if not same person or date
          if (next.empId !== current.empId || next.date !== current.date) {
            break;
          }

          // Skip if already deleted
          if (next.deleteRecord) {
            continue;
          }

          // Convert next time to minutes
          const [nextHours, nextMinutes] = next.time.split(":").map(Number);
          const nextTotalMinutes = nextHours * 60 + nextMinutes;

          // If within 3 minutes, mark for deletion
          if (Math.abs(nextTotalMinutes - currentTotalMinutes) <= 3) {
            try {
              await axios.post(
                `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
                {
                  entries: [
                    {
                      ...next,
                      processed: 0,
                      remarks: "REPEAT " + (next.remarks || ""),
                      deleteRecord: 1,
                    },
                  ],
                }
              );
            } catch (error) {
              console.error("Error updating entry:", error);
            }
          }
        }
      }

      // Refresh data after all processing is complete
      await fetchEntries();
    } catch (error) {
      console.error("Error in delete repeat process:", error);
      setError("Failed to process repeating records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateHours = async () => {
    setLoading(true);
    setError(null);

    try {
      // Filter entries that need hours calculation
      const entriesToUpdate = entries.filter(
        (entry) =>
          entry.processed === 1 &&
          entry.deleteRecord !== 1 &&
          entry.timeIn &&
          entry.timeOut
      );

      console.log("Start calculating hours:");

      // Calculate hours for each entry
      const updatedEntries = entriesToUpdate.map((entry) => {
        // Convert times to minutes for easier calculation
        const timeInParts = entry.timeIn.split(":").map(Number);
        const timeOutParts = entry.timeOut.split(":").map(Number);

        let timeInMinutes = timeInParts[0] * 60 + timeInParts[1];
        let timeOutMinutes = timeOutParts[0] * 60 + timeOutParts[1];

        // If timeOut is less than timeIn, assume it's next day
        if (timeOutMinutes < timeInMinutes) {
          timeOutMinutes += 24 * 60; // Add 24 hours
        }

        let totalMinutes = timeOutMinutes - timeInMinutes;

        // Subtract lunch break (12:00-13:00) if period covers it
        if (timeInMinutes < 13 * 60 && timeOutMinutes > 12 * 60) {
          totalMinutes -= 60; // Subtract 1 hour
        }

        // Subtract dinner break (19:00-20:00) if period covers it
        if (timeInMinutes < 20 * 60 && timeOutMinutes > 19 * 60) {
          totalMinutes -= 60; // Subtract 1 hour
        }

        // Convert minutes to hours
        const totalHours = totalMinutes / 60;

        // Calculate regular hours and overtime
        let regularHours = totalHours;
        let overtimeHours = 0;

        if (totalHours > 8) {
          regularHours = 8;
          overtimeHours = totalHours - 8;
        }

        const updatedEntry = {
          id: entry.id,
          batchId: entry.batchId,
          hours: regularHours.toFixed(2),
          overtime: overtimeHours.toFixed(2),
        };

        return updatedEntry;
      });

      console.log("Updating table:");
      // Send all updates in one request
      if (updatedEntries.length > 0) {
        const response = await axios.post(
          `${ServerIP}/auth/dtr/update-hours/${batch.id}`,
          {
            entries: updatedEntries,
          }
        );
        console.log("Done updating table:");
      }

      // Refresh data after all calculations are complete
      await fetchEntries();
      console.log("Entries refreshed after update");
    } catch (error) {
      setError("Failed to calculate hours. Please try again.");
    } finally {
      setLoading(false);
    }
    handleSundayHoliday();
  };

  const handleTimeClick = (entry, type, event) => {
    // Only allow clicking if the record isn't deleted and either:
    // 1. The field is empty, or
    // 2. The field has been manually edited before
    if (
      entry.deleteRecord ||
      (type === "in" && entry.timeIn && !entry.editedIn) ||
      (type === "out" && entry.timeOut && !entry.editedOut)
    ) {
      return;
    }

    let defaultTimeValue = "";
    let defaultDateValue = "";

    // Set default date based on type
    if (type === "in") {
      defaultDateValue = entry.date;
    } else if (type === "out") {
      defaultDateValue = entry.dateOut === "" ? entry.date : entry.dateOut;
    }

    // If there's an existing time for this type, use it
    if (type === "in" && entry.timeIn) {
      defaultTimeValue = entry.timeIn.substring(0, 5); // Remove seconds
    } else if (type === "out" && entry.timeOut) {
      defaultTimeValue = entry.timeOut.substring(0, 5); // Remove seconds
    } else {
      // Calculate default time based on the other time field
      if (type === "in" && entry.timeOut) {
        const [hours, minutes] = entry.timeOut.split(":");
        let newHours = parseInt(hours) - 4;
        if (newHours < 0) newHours += 24;
        defaultTimeValue = `${String(newHours).padStart(2, "0")}:${minutes}`;
      } else if (type === "out" && entry.timeIn) {
        const [hours, minutes] = entry.timeIn.split(":");
        let newHours = (parseInt(hours) + 4) % 24;
        defaultTimeValue = `${String(newHours).padStart(2, "0")}:${minutes}`;
      } else {
        // If no existing times, use the raw time from the entry
        defaultTimeValue = entry.time.substring(0, 5); // Remove seconds
      }
    }

    setSelectedEntry(entry);
    setTimeType(type);
    setDefaultTime(defaultTimeValue);
    setFloatingPosition({ x: event.clientX - 150, y: event.clientY + 20 });
    setShowFloatingTime(true);
  };

  const handleTimeUpdate = async (newTime, newDate) => {
    if (!newTime || !selectedEntry || !newDate) return;

    try {
      let needsSwap = false;

      // Check if we need to swap times
      if (selectedEntry.editedIn === 1) {
        // compare newdate+newTime with dateOut+timeOut
        const newDateTime = new Date(`${newDate}T${newTime}`);
        const dateOut = new Date(
          `${selectedEntry.dateOut}T${selectedEntry.timeOut}`
        );
        needsSwap = newDateTime > dateOut;
      } else if (selectedEntry.editedOut === 1) {
        // compare newdate+newTime with date+timeIn
        const newDateTime = new Date(`${newDate}T${newTime}`);
        const dateIn = new Date(
          `${selectedEntry.date}T${selectedEntry.timeIn}`
        );
        needsSwap = newDateTime < dateIn;
      }

      if (needsSwap) {
        // Handle swap case
        const newEditedIn = selectedEntry.editedOut;
        const newEditedOut = selectedEntry.editedIn;
        const [newTimeIn, newTimeOut] =
          selectedEntry.editedIn === 0
            ? [newTime, selectedEntry.timeIn]
            : [selectedEntry.timeOut, newTime];

        const response = await axios.post(
          `${ServerIP}/auth/dtr/update-time-in-out/${batch.id}`,
          {
            id: selectedEntry.id,
            timeIn: newTimeIn,
            timeOut: newTimeOut,
            editedIn: newEditedIn,
            editedOut: newEditedOut,
            date: timeType === "in" ? newDate : selectedEntry.date,
            dateOut:
              timeType === "out"
                ? newDate
                : selectedEntry.dateOut || selectedEntry.date,
          }
        );

        if (response.data.Status) {
          setEntries((prevEntries) =>
            prevEntries.map((prevEntry) => {
              if (prevEntry.id === selectedEntry.id) {
                return {
                  ...prevEntry,
                  timeIn: newTimeIn,
                  timeOut: newTimeOut,
                  editedIn: newEditedIn,
                  editedOut: newEditedOut,
                  date: timeType === "in" ? newDate : prevEntry.date,
                  dateOut:
                    timeType === "out"
                      ? newDate
                      : prevEntry.dateOut || prevEntry.date,
                  processed: 1,
                  remarks: (prevEntry.remarks || "") + " | TIMES SWAPPED",
                };
              }
              return prevEntry;
            })
          );
        }
      } else {
        // Handle normal update case
        const endpoint =
          timeType === "in" ? "update-time-in" : "update-time-out";
        const payload = {
          id: selectedEntry.id,
          [timeType === "in" ? "timeIn" : "timeOut"]: newTime,
          [timeType === "in" ? "date" : "dateOut"]: newDate,
          processed: 1,
        };

        const response = await axios.post(
          `${ServerIP}/auth/dtr/${endpoint}/${batch.id}`,
          payload
        );

        if (response.data.Status) {
          setEntries((prevEntries) =>
            prevEntries.map((prevEntry) => {
              if (prevEntry.id === selectedEntry.id) {
                return {
                  ...prevEntry,
                  [timeType === "in" ? "timeIn" : "timeOut"]: newTime,
                  [timeType === "in" ? "date" : "dateOut"]: newDate,
                  [timeType === "in" ? "editedIn" : "editedOut"]: 1,
                  processed: 1,
                  remarks:
                    (prevEntry.remarks || "") +
                    (timeType === "in" ? " | MANUAL IN" : " | MANUAL OUT"),
                };
              }
              return prevEntry;
            })
          );
        }
      }
    } catch (error) {
      console.error("Error updating time:", error);
      alert("Failed to update time. Please try again.");
    } finally {
      setShowFloatingTime(false);
      setSelectedEntry(null);
      setTimeType(null);
    }
  };

  const handleAddDate = async (entry) => {
    try {
      const response = await axios.post(
        `${ServerIP}/auth/dtr/add-entry/${batch.id}`,
        {
          entry,
        }
      );

      if (response.data.Status) {
        await fetchEntries();
      } else {
        setError(response.data.Error || "Failed to add entry");
      }
    } catch (error) {
      console.error("Error adding entry:", error);
      setError("Failed to add entry. Please try again.");
    }
  };

  const handleDateClick = (entry, event) => {
    event.preventDefault();
    setContextMenuEntry(entry);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowDateContextMenu(true);
  };

  const handleDateContextMenuAction = async (action) => {
    if (!contextMenuEntry) return;

    try {
      if (action === "add") {
        setEmpId(contextMenuEntry.empId);
        setEmpName(contextMenuEntry.empName);
        setDate(contextMenuEntry.date);
        setTimeIn("08:00");
        setTimeOut("17:00");
        setShowAddDateModal(true);
      } else if (action === "delete") {
        await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
          entries: [
            {
              ...contextMenuEntry,
              processed: 0,
              remarks: "DELETED " + (contextMenuEntry.remarks || ""),
              deleteRecord: 1,
            },
          ],
        });
        await fetchEntries();
      } else if (action === "changeName") {
        setNewName(contextMenuEntry.empName);
        setShowChangeNameModal(true);
      }
    } catch (error) {
      console.error("Error handling date context menu action:", error);
      setError("Failed to process action. Please try again.");
    } finally {
      setShowDateContextMenu(false);
    }
  };

  const handleChangeName = async () => {
    if (!newName.trim() || !contextMenuEntry) return;

    try {
      // Update all entries with the same empId
      const entriesToUpdate = entries
        .filter((entry) => entry.empId === contextMenuEntry.empId)
        .map((entry) => ({
          ...entry,
          empName: newName,
        }));

      if (entriesToUpdate.length > 0) {
        await axios.post(`${ServerIP}/auth/dtr/change-name/${batch.id}`, {
          entries: entriesToUpdate,
        });
        await fetchEntries();
      }
      setShowChangeNameModal(false);
    } catch (error) {
      console.error("Error changing name:", error);
      setError("Failed to change name. Please try again.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setShowDateContextMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeRightClick = async (e, entry, type) => {
    e.preventDefault();

    if (entry.deleteRecord) return;

    setRightClickTarget(`${entry.id}-${type}`);
    const referenceTime = `${referenceHours}:${referenceMinutes}:00`;

    try {
      const endpoint =
        type === "in" ? "update-time-in-only" : "update-time-out-only";
      const payload = {
        id: entry.id,
        time: referenceTime,
      };

      const response = await axios.post(
        `${ServerIP}/auth/dtr/${endpoint}/${batch.id}`,
        payload
      );

      if (response.data.Status) {
        // Update the local state instead of fetching all data
        setEntries((prevEntries) =>
          prevEntries.map((prevEntry) => {
            if (prevEntry.id === entry.id) {
              return {
                ...prevEntry,
                [type === "in" ? "timeIn" : "timeOut"]: referenceTime,
              };
            }
            return prevEntry;
          })
        );
      } else {
        setError(response.data.Error || `Failed to update ${type} time`);
      }
    } catch (error) {
      console.error(`Error updating ${type} time:`, error);
      setError(`Failed to update ${type} time. Please try again.`);
    } finally {
      setTimeout(() => setRightClickTarget(null), 300);
    }
  };

  const handleSundayHoliday = async () => {
    try {
      setLoading(true);
      setError(null);

      // First process Sunday entries
      for (const entry of entries) {
        // Skip if entry is deleted
        if (entry.deleteRecord) continue;

        // Only process if we have both timeIn and timeOut
        if (entry.timeIn && entry.timeOut) {
          let sundayHours = 0;
          let sundayOT = 0;
          let holidayHours = 0;
          let holidayOT = 0;
          let holidayType = "";
          let nightDifferential = 0;

          // Check if the date is a holiday
          const entryDate = new Date(entry.date);
          const holiday = holidays.find(
            (h) =>
              new Date(h.holidayDate).toDateString() ===
              entryDate.toDateString()
          );

          // Only process if it's Sunday or a holiday
          if (entry.day?.toLowerCase() === "sun" || holiday) {
            // For Sunday entries, move regular hours to sundayHours and OT to sundayOT
            if (entry.day?.toLowerCase() === "sun") {
              if (holiday) {
                holidayHours = Number(entry.hours);
                holidayOT = Number(entry.overtime);
                holidayType = `Sunday ${holiday.holidayType}`;
              } else {
                sundayHours = Number(entry.hours);
                sundayOT = Number(entry.overtime);
              }
              // Clear regular hours and OT for Sundays
              entry.hours = 0;
              entry.overtime = 0;
            } else if (holiday) {
              // For non-Sunday holidays
              holidayHours = Number(entry.hours);
              holidayOT = Number(entry.overtime);
              holidayType = holiday.holidayType;
              // Clear regular hours and OT for holidays
              entry.hours = 0;
              entry.overtime = 0;
            }

            // Update the database one entry at a time
            const response = await axios.post(
              `${ServerIP}/auth/dtr/update-special-hours/${batch.id}`,
              {
                entry: {
                  id: entry.id,
                  sundayHours:
                    sundayHours > 0 ? Number(sundayHours.toFixed(2)) : 0,
                  sundayOT: sundayOT > 0 ? Number(sundayOT.toFixed(2)) : 0,
                  holidayHours:
                    holidayHours > 0 ? Number(holidayHours.toFixed(2)) : 0,
                  holidayOT: holidayOT > 0 ? Number(holidayOT.toFixed(2)) : 0,
                  holidayType: holidayType || "",
                  nightDifferential:
                    nightDifferential > 0
                      ? Number(nightDifferential.toFixed(2))
                      : 0,
                  hours: entry.hours,
                  overtime: entry.overtime,
                },
              }
            );

            if (!response.data.Status) {
              throw new Error(response.data.Error || "Failed to update entry");
            }
          }
        }
      }

      // After all entries are processed, refresh the data
      await fetchEntries();
      setAlert({
        show: true,
        title: "Success",
        message: "Successfully calculated Hour, Sunday and holiday hours",
        variant: "success",
      });
    } catch (error) {
      console.error("Error processing Sunday/Holiday hours:", error);
      setError("Failed to process Sunday/Holiday hours. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePeriod = async (newStartDate, newEndDate) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${ServerIP}/auth/dtr/update-period/${batch.id}`,
        {
          periodStart: newStartDate,
          periodEnd: newEndDate,
        }
      );

      if (response.data.Status) {
        // Update the local batch data
        batch.periodStart = newStartDate;
        batch.periodEnd = newEndDate;
        // Refresh the data to recalculate totals
        await fetchEntries();
      } else {
        setError(response.data.Error || "Failed to update period dates");
      }
    } catch (error) {
      console.error("Error updating period dates:", error);
      setError("Failed to update period dates. Please try again.");
    } finally {
      setLoading(false);
      setShowEditPeriodModal(false);
    }
  };

  const renderTabs = () => (
    <ul className="nav nav-tabs mb-3">
      <li className="nav-item">
        <button
          className={`nav-link ${activeTab === "entries" ? "active" : ""}`}
          onClick={() => setActiveTab("entries")}
        >
          Entries
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link ${activeTab === "totals" ? "active" : ""}`}
          onClick={() => setActiveTab("totals")}
        >
          Totals
        </button>
      </li>
    </ul>
  );

  const renderButtons = () => (
    <div className="mb-3 d-flex gap-2">
      <Button variant="edit" onClick={handleDeleteRepeat} disabled={loading}>
        Delete Repeat
      </Button>
      <Button variant="cancel" onClick={handleAnalyze} disabled={loading}>
        Analyze Time In/Out
      </Button>
      <Button variant="view" onClick={handleCalculateHours} disabled={loading}>
        Calculate Hours
      </Button>
      <Button
        variant="danger"
        onClick={handleReset}
        disabled={loading}
        className="ms-auto"
      >
        RESET
      </Button>
    </div>
  );

  if (!batch) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center mt-4">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mt-3">{error}</div>;
  }

  return (
    <div className="dtr-batch-view">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type="alert"
        onClose={() => setAlert({ ...alert, show: false })}
      />

      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h3>Batch Details: {batch.batchName}</h3>
          <div className="d-flex align-items-center gap-2">
            <strong>Period:</strong> {formatDate(batch.periodStart)} -{" "}
            {formatDate(batch.periodEnd)}
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowEditPeriodModal(true)}
              title="Edit period dates"
            >
              <i className="bi bi-pencil"></i>
            </Button>
          </div>
          <div>
            <strong>Total Entries:</strong> {entries.length}
          </div>
        </div>
        <div>
          <Button variant="print" onClick={onBack} className="ms-2">
            <i className="bi bi-arrow-left"></i> Back to Batches
          </Button>
        </div>
      </div>

      {renderButtons()}

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by ID, name, date or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mb-3 d-flex align-items-center gap-5">
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="hideDeleted"
            checked={hideDeleted}
            onChange={(e) => setHideDeleted(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="hideDeleted">
            Hide deleted records
          </label>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="form-label mb-0 ml-4">Reference Time:</label>
          <div className="d-flex gap-1 align-items-center">
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: "28px" }}
              value={referenceHours}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 23) {
                  setReferenceHours(val.toString().padStart(2, "0"));
                }
              }}
              onFocus={(e) => e.target.select()}
              min="0"
              max="23"
              placeholder="HH"
            />
            <span>:</span>
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: "28px" }}
              value={referenceMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 59) {
                  setReferenceMinutes(val.toString().padStart(2, "0"));
                }
              }}
              onFocus={(e) => e.target.select()}
              min="0"
              max="59"
              placeholder="MM"
            />
          </div>
        </div>
      </div>

      {renderTabs()}

      {activeTab === "entries" ? (
        <>
          {sortedEntries.length === 0 ? (
            <div className="alert alert-info mt-3">
              {searchTerm
                ? "No matching records found."
                : "No records found in this batch."}
            </div>
          ) : (
            <div className="table-responsive mt-3">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr>
                    <th
                      onClick={() => handleSort("empId")}
                      style={{ cursor: "pointer" }}
                    >
                      ID {getSortIndicator("empId")}
                    </th>
                    <th
                      onClick={() => handleSort("empName")}
                      style={{ cursor: "pointer" }}
                    >
                      Name {getSortIndicator("empName")}
                    </th>
                    <th
                      onClick={() => handleSort("day")}
                      style={{ cursor: "pointer" }}
                    >
                      Day {getSortIndicator("day")}
                    </th>
                    <th
                      onClick={() => handleSort("date")}
                      style={{ cursor: "pointer" }}
                    >
                      Date {getSortIndicator("date")}
                    </th>
                    <th
                      onClick={() => handleSort("time")}
                      style={{ cursor: "pointer" }}
                    >
                      Orig Time {getSortIndicator("time")}
                    </th>
                    <th
                      onClick={() => handleSort("timeIn")}
                      style={{ cursor: "pointer" }}
                    >
                      Time In {getSortIndicator("timeIn")}
                    </th>
                    <th
                      onClick={() => handleSort("date")}
                      style={{ cursor: "pointer" }}
                    >
                      Date Out {getSortIndicator("dateOut")}
                    </th>
                    <th
                      onClick={() => handleSort("timeOut")}
                      style={{ cursor: "pointer" }}
                    >
                      Time Out {getSortIndicator("timeOut")}
                    </th>
                    <th
                      onClick={() => handleSort("state")}
                      style={{ cursor: "pointer" }}
                    >
                      State {getSortIndicator("state")}
                    </th>
                    <th
                      onClick={() => handleSort("hours")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Hours {getSortIndicator("hours")}
                    </th>
                    <th
                      onClick={() => handleSort("overtime")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      OT {getSortIndicator("overtime")}
                    </th>
                    <th
                      onClick={() => handleSort("sundayHours")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Sun Hrs {getSortIndicator("sundayHours")}
                    </th>
                    <th
                      onClick={() => handleSort("sundayOT")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Sun OT {getSortIndicator("sundayOT")}
                    </th>

                    <th
                      onClick={() => handleSort("holidayHours")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Hol Hrs {getSortIndicator("holidayHours")}
                    </th>
                    <th
                      onClick={() => handleSort("holidayOT")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Hol OT {getSortIndicator("holidayOT")}
                    </th>
                    <th
                      onClick={() => handleSort("holidayType")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Hol Type {getSortIndicator("holidayType")}
                    </th>

                    <th
                      onClick={() => handleSort("nightDifferential")}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      Night Diff {getSortIndicator("nightDifferential")}
                    </th>
                    <th style={{ textAlign: "center" }}>Raw State</th>
                    <th style={{ textAlign: "center" }}>Remarks</th>
                    <th style={{ textAlign: "center" }}>Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry, index) => {
                    const bgColor = getDayColor(entry.day);
                    const rowStyle = {
                      backgroundColor: bgColor,
                      textDecoration: entry.deleteRecord
                        ? "line-through"
                        : "none",
                    };

                    return (
                      <tr
                        key={entry.id || index}
                        className={entry.holidayHours > 0 ? "holiday-row" : ""}
                      >
                        <td style={rowStyle}>{entry.empId}</td>
                        <td style={rowStyle}>{entry.empName}</td>
                        <td style={rowStyle}>{entry.day}</td>
                        <td
                          style={{
                            ...rowStyle,
                            cursor: "pointer",
                            color: "blue",
                            position: "relative",
                          }}
                          onClick={(e) => handleDateClick(entry, e)}
                          title="Click to show options"
                        >
                          {formatDate(entry.date)}
                        </td>
                        <td style={rowStyle}>{formatTime(entry.time)}</td>
                        <td
                          style={{
                            ...rowStyle,
                            cursor:
                              (!entry.timeIn || entry.editedIn) &&
                              !entry.deleteRecord
                                ? "pointer"
                                : "default",
                            color:
                              (!entry.timeIn || entry.editedIn) &&
                              !entry.deleteRecord
                                ? "blue"
                                : "inherit",
                            fontWeight: entry.editedIn ? "bold" : "normal",
                            backgroundColor:
                              rightClickTarget === `${entry.id}-in`
                                ? "#fff3cd"
                                : undefined,
                            transition: "background-color 0.3s",
                          }}
                          onClick={(e) => handleTimeClick(entry, "in", e)}
                          onContextMenu={(e) =>
                            handleTimeRightClick(e, entry, "in")
                          }
                          title="Right-click to set reference time"
                        >
                          {formatTime(entry.timeIn)}
                        </td>
                        <td style={rowStyle}>{formatDate(entry.dateOut)}</td>
                        <td
                          style={{
                            ...rowStyle,
                            cursor:
                              (!entry.timeOut || entry.editedOut) &&
                              !entry.deleteRecord
                                ? "pointer"
                                : "default",
                            color:
                              (!entry.timeOut || entry.editedOut) &&
                              !entry.deleteRecord
                                ? "blue"
                                : "inherit",
                            fontWeight: entry.editedOut ? "bold" : "normal",
                            backgroundColor:
                              rightClickTarget === `${entry.id}-out`
                                ? "#fff3cd"
                                : undefined,
                            transition: "background-color 0.3s",
                          }}
                          onClick={(e) => handleTimeClick(entry, "out", e)}
                          onContextMenu={(e) =>
                            handleTimeRightClick(e, entry, "out")
                          }
                          title="Right-click to set reference time"
                        >
                          {formatTime(entry.timeOut)}
                        </td>
                        <td style={rowStyle}>{entry.state || "-"}</td>
                        <td style={rowStyle}>
                          {Number(entry.hours || 0) > 0
                            ? Number(entry.hours).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>
                          {Number(entry.overtime || 0) > 0
                            ? Number(entry.overtime).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>
                          {Number(entry.sundayHours || 0) > 0
                            ? Number(entry.sundayHours).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>
                          {Number(entry.sundayOT || 0) > 0
                            ? Number(entry.sundayOT).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>
                          {Number(entry.holidayHours || 0) > 0
                            ? Number(entry.holidayHours).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>
                          {Number(entry.holidayOT || 0) > 0
                            ? Number(entry.holidayOT).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>{entry.holidayType || ""}</td>
                        <td style={rowStyle}>
                          {Number(entry.nightDifferential || 0) > 0
                            ? Number(entry.nightDifferential).toFixed(2)
                            : ""}
                        </td>
                        <td style={rowStyle}>{entry.rawState || ""}</td>
                        <td style={rowStyle}>{entry.remarks || ""}</td>
                        <td style={rowStyle}>{entry.processed || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <DTRTotalView
          entries={sortedEntries}
          batch={batch}
          holidays={holidays}
        />
      )}

      <ModalAlert
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        title="Confirm Time Entry"
        type="confirm"
        message={
          currentEntry
            ? `Previous record: ${currentEntry.current.empName} (${
                currentEntry.current.empId
              })
             Date: ${formatDate(currentEntry.current.date)}
             Time: ${currentEntry.current.time}

             Current record: ${currentEntry.next.empName} (${
                currentEntry.next.empId
              })
             Date: ${formatDate(currentEntry.next.date)}
             Time: ${currentEntry.next.time}

             Is this after-midnight time (${
               currentEntry.next.time
             }) a timeout for the previous day's record?`
            : ""
        }
        confirmText="Yes, it's a timeout for previous day"
        cancelText="No, it's a new timein"
        onConfirm={() => handleConfirmTime(true)}
        onClose={() => handleConfirmTime(false)}
      />

      <FloatingTimeInput
        show={showFloatingTime}
        position={floatingPosition}
        onHide={() => setShowFloatingTime(false)}
        onSave={handleTimeUpdate}
        defaultTime={defaultTime}
        type={timeType}
        entry={selectedEntry}
        formatDate={formatDate}
      />

      <AddDateModal
        show={showAddDateModal}
        onHide={() => {
          setShowAddDateModal(false);
          setEmpId("");
          setEmpName("");
          setDate("");
          setTimeIn("08:00");
          setTimeOut("17:00");
        }}
        onSave={handleAddDate}
        batch={batch}
        empId={empId}
        empName={empName}
        date={date}
        timeIn={timeIn}
        timeOut={timeOut}
      />

      <EditPeriodModal
        show={showEditPeriodModal}
        onHide={() => setShowEditPeriodModal(false)}
        onSave={handleUpdatePeriod}
        batch={batch}
      />

      {showDateContextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            zIndex: 1000,
            padding: "4px 0",
          }}
        >
          <div
            className="px-3 py-2"
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
            onClick={() => handleDateContextMenuAction("add")}
          >
            Add Next Day
          </div>
          <div
            className="px-3 py-2"
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
            onClick={() => handleDateContextMenuAction("changeName")}
          >
            Change Name
          </div>
          <div
            className="px-3 py-2"
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
            onClick={() => handleDateContextMenuAction("delete")}
          >
            Delete Record
          </div>
        </div>
      )}

      <Modal
        show={showChangeNameModal}
        onHide={() => setShowChangeNameModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Change Employee Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleChangeName();
            }}
          >
            <div className="mb-3">
              <label className="form-label">Current Name</label>
              <input
                type="text"
                className="form-control"
                value={contextMenuEntry?.empName || ""}
                disabled
              />
            </div>
            <div className="mb-3">
              <label className="form-label">New Name</label>
              <input
                type="text"
                className="form-control"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowChangeNameModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

const FloatingTimeInput = ({
  show,
  position,
  onHide,
  onSave,
  defaultTime,
  type,
  entry,
  formatDate,
}) => {
  const [localPosition, setLocalPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState("");
  const hourInputRef = useRef(null); // Add ref for the hour input field

  useEffect(() => {
    if (defaultTime) {
      const [h, m] = defaultTime.split(":");
      setHours(h);
      setMinutes(m);
    }

    // Set the date based on entry and type
    if (entry) {
      if (type === "in") {
        setDate(entry.date);
      } else {
        setDate(entry.dateOut || entry.date);
      }
    }
  }, [defaultTime, entry, type]);

  // Focus on the hour input when the popup appears
  useEffect(() => {
    if (show && hourInputRef.current) {
      setTimeout(() => {
        hourInputRef.current.focus();
      }, 50); // Small delay to ensure DOM is ready
    }
  }, [show]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setLocalPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleTimeSubmit = async (e) => {
    e.preventDefault();
    const formattedTime = `${hours.padStart(2, "0")}:${minutes.padStart(
      2,
      "0"
    )}:00`;
    onSave(formattedTime, date);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: localPosition.x,
        top: localPosition.y,
        zIndex: 1050,
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        width: "320px",
      }}
    >
      <div
        style={{
          padding: "8px",
          backgroundColor: "#f8f9fa",
          borderBottom: "1px solid #ccc",
          cursor: "move",
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="d-flex justify-content-between align-items-center">
          <span>Enter Time {type === "in" ? "In" : "Out"}</span>
          <button
            type="button"
            className="btn-close"
            onClick={onHide}
            aria-label="Close"
          ></button>
        </div>
      </div>

      <div style={{ padding: "15px" }}>
        <form onSubmit={handleTimeSubmit}>
          <div className="mb-2">
            <small>
              {entry?.empName} - {formatDate(entry?.date)}
            </small>
          </div>
          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="d-flex gap-2 align-items-center mb-3">
            <div>
              <label className="form-label">Hours</label>
              <input
                ref={hourInputRef} // Add ref to the hour input
                type="number"
                className="form-control"
                style={{ width: "80px" }}
                value={hours}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 23) {
                    setHours(val.toString());
                  }
                }}
                onFocus={(e) => e.target.select()}
                min="0"
                max="23"
                required
              />
            </div>
            <div className="pt-4">:</div>
            <div>
              <label className="form-label">Minutes</label>
              <input
                type="number"
                className="form-control"
                style={{ width: "80px" }}
                value={minutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 59) {
                    setMinutes(val.toString());
                  }
                }}
                onFocus={(e) => e.target.select()}
                min="0"
                max="59"
                required
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="primary" type="submit">
              Save
            </Button>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddDateModal = ({
  show,
  onHide,
  onSave,
  batch,
  empId,
  empName,
  date,
  timeIn,
  timeOut,
}) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [localEmpId, setLocalEmpId] = useState(empId);
  const [localEmpName, setLocalEmpName] = useState(empName);
  const [localDate, setLocalDate] = useState(date);
  const [localTimeIn, setLocalTimeIn] = useState(timeIn);
  const [localTimeOut, setLocalTimeOut] = useState(timeOut);
  const timeInRef = useRef(null);

  useEffect(() => {
    if (show) {
      setLocalEmpId(empId);
      setLocalEmpName(empName);
      setLocalDate(date);
      setLocalTimeIn(timeIn);
      setLocalTimeOut(timeOut);
      fetchEmployees();

      // Focus on the time in field after the modal is shown
      setTimeout(() => {
        if (timeInRef.current) {
          timeInRef.current.focus();
        }
      }, 300); // Slightly longer delay for modal animation
    }
  }, [show, empId, empName, date, timeIn, timeOut]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/dtr/DTRemployees`);
      if (response.data.Status) {
        setEmployees(response.data.Employees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleAddDateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dayOfWeek = new Date(localDate).toLocaleDateString("en-US", {
        weekday: "short",
      });

      const entry = {
        empId: localEmpId,
        empName: localEmpName,
        date: localDate,
        day: dayOfWeek,
        timeIn: localTimeIn + ":00",
        timeOut: localTimeOut + ":00",
        processed: 1,
        editedIn: 1,
        editedOut: 1,
        remarks: "MANUAL ADD",
      };

      await onSave(entry);
      onHide();
    } catch (error) {
      console.error("Error adding entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (e) => {
    const selectedEmp = employees.find((emp) => emp.empId === e.target.value);
    if (selectedEmp) {
      setLocalEmpId(selectedEmp.empId);
      setLocalEmpName(selectedEmp.empName);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Missing Date</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleAddDateSubmit}>
          <div className="mb-3">
            <label className="form-label">Employee</label>
            <select
              className="form-select"
              value={localEmpId}
              onChange={handleEmployeeSelect}
              required
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.empId} value={emp.empId}>
                  {emp.empName} ({emp.empId})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              min={batch.periodStart}
              max={batch.periodEnd}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Time In (HH:MM)</label>
            <input
              ref={timeInRef}
              type="time"
              className="form-control"
              value={localTimeIn}
              onChange={(e) => setLocalTimeIn(e.target.value)}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Time Out (HH:MM)</label>
            <input
              type="time"
              className="form-control"
              value={localTimeOut}
              onChange={(e) => setLocalTimeOut(e.target.value)}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

const EditPeriodModal = ({ show, onHide, onSave, batch }) => {
  const [startDate, setStartDate] = useState(batch?.periodStart || "");
  const [endDate, setEndDate] = useState(batch?.periodEnd || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      setStartDate(batch?.periodStart || "");
      setEndDate(batch?.periodEnd || "");
      setError("");
    }
  }, [show, batch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate dates
    if (!startDate || !endDate) {
      setError("Both dates are required");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError("End date cannot be earlier than start date");
      return;
    }

    setLoading(true);
    try {
      await onSave(startDate, endDate);
    } catch (error) {
      setError("Failed to update period dates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Period Dates</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger mb-3">{error}</div>}
          <div className="mb-3">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default DTRBatchView;
