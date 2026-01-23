import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import "./DTR.css";
// import DTRUploader from "./DTRUploader";
import DTRBatchList from "./DTRBatchList";
import DTRSummaryReport from "./DTRSummaryReport";
import DTRDetailReport from "./DTRDetailReport";
import DTRBatchView from "./DTRBatchView";
import DTRHolidays from "./DTRHolidays";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./DTRHolidays.css";

const DTR = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upload");
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState("summary"); // 'summary' or 'detail' or 'batch-view'
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // For resetting file input

  // Add form state variables
  const [batchName, setBatchName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isEditingExistingBatch, setIsEditingExistingBatch] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching batches from:", `${ServerIP}/auth/dtr/batches`);
      const response = await axios.get(`${ServerIP}/auth/dtr/batches`);
      console.log("Batch response:", response.data);

      // Always initialize with an empty array if we get no batches
      let batchData = [];

      // Handle different response formats
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Direct array response
          console.log("Setting batches from direct array:", response.data);
          batchData = response.data;
        } else if (
          response.data.Status === true &&
          Array.isArray(response.data.Result)
        ) {
          // Status + Result format
          console.log("Setting batches from Result:", response.data.Result);
          batchData = response.data.Result;
        } else if (Array.isArray(response.data.batches)) {
          // batches property format
          console.log(
            "Setting batches from batches property:",
            response.data.batches
          );
          batchData = response.data.batches;
        } else {
          console.warn("Unexpected response format:", response.data);
          // Don't set error here as we'll handle with empty array
        }
      } else {
        console.warn("Empty response data - using empty array");
      }

      // Set batches to the data we found, or an empty array
      setBatches(batchData || []);
    } catch (err) {
      console.error("Error fetching batches:", err);
      setError("Failed to load DTR batches. Please try again later.");
      setBatches([]); // Ensure we have an empty array even on error
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setViewMode("summary");
    setActiveTab("report");
  };

  const handleAddFilesToBatch = (batch) => {
    console.log("Adding files to batch:", batch);
    setSelectedBatch(batch);
    setIsEditingExistingBatch(true);
    setBatchName(batch.batchName);

    // Fix date handling to prevent off-by-one day issues
    // For periodStart
    const startDate = new Date(batch.periodStart);
    startDate.setMinutes(
      startDate.getMinutes() + startDate.getTimezoneOffset()
    );
    setPeriodStart(startDate.toISOString().substring(0, 10));

    // For periodEnd
    const endDate = new Date(batch.periodEnd);
    endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
    setPeriodEnd(endDate.toISOString().substring(0, 10));

    setActiveTab("upload");
  };

  const handleViewBatch = (batch) => {
    console.log("Viewing detailed batch data:", batch);
    setSelectedBatch(batch);
    setViewMode("batch-view");
    setActiveTab("report");
  };

  const handleExportBatch = async (batch) => {
    try {
      setLoading(true);
      console.log(`Exporting batch: ${batch.id} - ${batch.batchName}`);

      // Fetch all the entries for this batch
      const response = await axios.get(
        `${ServerIP}/auth/dtr/export/${batch.id}`
      );

      if (
        !response.data.Status ||
        !response.data.Entries ||
        response.data.Entries.length === 0
      ) {
        alert("No data available to export for this batch.");
        setLoading(false);
        return;
      }

      const entries = response.data.Entries;
      console.log(`Retrieved ${entries.length} entries for export`);

      // Convert data to CSV
      const headers = [
        "Employee ID",
        "Employee Name",
        "Date",
        "Day",
        "Time In",
        "Time Out",
        "State",
        "Hours",
        "Overtime",
        "Special Hours",
        "Remarks",
      ];
      const csvRows = [headers.join(",")];

      for (const entry of entries) {
        const row = [
          entry.empId,
          `"${entry.empName.replace(/"/g, '""')}"`, // Escape quotes in names
          entry.date,
          entry.day,
          entry.timeIn || "",
          entry.timeOut || "",
          entry.state || "",
          entry.hours || "0",
          entry.overtime || "0",
          entry.specialHours || "0",
          `"${(entry.remarks || "").replace(/"/g, '""')}"`, // Escape quotes in remarks
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");

      // Create a download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `DTR_Batch_${batch.id}_${batch.batchName.replace(/\s+/g, "_")}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Export complete for batch: ${batch.batchName}`);
    } catch (err) {
      console.error("Error exporting batch data:", err);
      alert(`Failed to export data: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (
      !window.confirm(
        `Are you sure you want to delete batch "${batch.batchName}"?\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      console.log(`Deleting batch: ${batch.id} - ${batch.batchName}`);

      const response = await axios.delete(
        `${ServerIP}/auth/dtr/DTRdelete/${batch.id}`
      );

      if (response.data.Status) {
        console.log("Batch deleted successfully");
        // Refresh the batch list
        await fetchBatches();
      } else {
        console.error("Failed to delete batch:", response.data.Error);
        alert(
          `Failed to delete batch: ${response.data.Error || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Error deleting batch:", err);
      const errorMessage =
        err?.response?.data?.Error ||
        (err?.response?.status === 404
          ? "Batch not found. It may have been deleted already."
          : err?.message) ||
        "Unknown error";
      alert(`Failed to delete batch: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    setViewMode("detail");
  };

  const handleBackToSummary = () => {
    setViewMode("summary");
    setSelectedEmployee(null);
  };

  const handleBackToBatches = () => {
    setActiveTab("batches");
    setViewMode("summary");
    setSelectedBatch(null);
    setSelectedEmployee(null);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = [];
    const errors = [];
    files.forEach((file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (!["xlsx", "csv"].includes(ext)) {
        errors.push(`${file.name} is not .xlsx or .csv`);
        return;
      }
      const maxBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxBytes) {
        errors.push(`${file.name} exceeds 10MB limit`);
        return;
      }
      valid.push(file);
    });

    setError(errors.length ? errors.join("; ") : null);
    setSelectedFiles(valid);
  };

  const handleStartDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    setPeriodStart(dateStr);
    setShowStartCalendar(false);
    // Generate batch name with the new date
    if (periodEnd) {
      const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
      };
      setBatchName(`DTR ${formatDate(dateStr)}-${formatDate(periodEnd)}`);
    }
  };

  const handleEndDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    setPeriodEnd(dateStr);
    setShowEndCalendar(false);
    // Generate batch name with the new date
    if (periodStart) {
      const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
      };
      setBatchName(`DTR ${formatDate(periodStart)}-${formatDate(dateStr)}`);
    }
  };

  const resetUploadForm = () => {
    setSelectedBatch(null);
    setIsEditingExistingBatch(false);
    setBatchName("");
    setPeriodStart("");
    setPeriodEnd("");
    setSelectedFiles([]);
    setFileInputKey(Date.now());
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    console.log("Starting upload process...");

    if (selectedFiles.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    if (!batchName.trim()) {
      setError("Please enter a batch name.");
      return;
    }

    if (!periodStart || !periodEnd) {
      setError("Please select both period start and end dates.");
      return;
    }

    const formData = new FormData();

    // Log each file being added
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      console.log(`Adding file ${i + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      formData.append("dtrFiles", file);
    }

    // Add other form data
    formData.append("batchName", batchName);
    formData.append("periodStart", periodStart);
    formData.append("periodEnd", periodEnd);

    // Log the complete request details
    console.log("Upload request details:", {
      url: isEditingExistingBatch
        ? `${ServerIP}/auth/dtr/add-to-batch/${selectedBatch.id}`
        : `${ServerIP}/auth/dtr/upload`,
      batchName,
      periodStart,
      periodEnd,
      batchId: isEditingExistingBatch ? selectedBatch?.id : undefined,
      fileCount: selectedFiles.length,
      files: selectedFiles.map((f) => f.name),
      formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? `File: ${value.name}` : value,
      })),
    });

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        isEditingExistingBatch
          ? `${ServerIP}/auth/dtr/add-to-batch/${selectedBatch.id}`
          : `${ServerIP}/auth/dtr/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Upload response:", response.data);

      // Check for errors in response
      if (response.data.Status === false || response.data.status === "error") {
        const errorMessage =
          response.data.Error ||
          response.data.message ||
          "Error uploading files. Please try again.";
        console.error("Upload error:", errorMessage);
        setError(errorMessage);
        return;
      }

      console.log("Upload successful! Resetting form...");

      // Reset form state
      setUploadSuccess(true);
      resetUploadForm();

      // Update the batches list
      console.log("Fetching updated batch list...");
      await fetchBatches();

      console.log("Switching to batches tab...");
      // Wait a moment before switching tabs to ensure batches are loaded
      setTimeout(() => {
        setActiveTab("batches");
      }, 1000);
    } catch (err) {
      console.error("Upload error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        fullError: err,
        requestDetails: {
          batchId: selectedBatch?.id,
          fileCount: selectedFiles.length,
          isEditingBatch: isEditingExistingBatch,
        },
      });
      const errorMessage =
        err.response?.data?.Error ||
        err.response?.data?.message ||
        "Failed to upload DTR files. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tab) => {
    // If switching to batches tab, refresh the data
    if (tab === "batches") {
      fetchBatches();
    }

    // If switching to upload tab from another tab and not editing a batch,
    // reset the form
    if (tab === "upload" && activeTab !== "upload" && !isEditingExistingBatch) {
      resetUploadForm();
    }

    setActiveTab(tab);

    // If switching away from report tab, clean up the selection state
    if (tab !== "report") {
      setSelectedBatch(null);
      setSelectedEmployee(null);
      setViewMode("summary");
    }
  };

  const generateBatchName = () => {
    // Don't generate a new name if editing an existing batch
    if (isEditingExistingBatch) return;
  };

  const renderContent = () => {
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

    if (uploadSuccess) {
      return (
        <div className="alert alert-success mt-3">
          DTR files uploaded successfully!
          <button
            className="btn-close float-end"
            onClick={() => setUploadSuccess(false)}
          ></button>
        </div>
      );
    }

    switch (activeTab) {
      case "upload":
        return (
          <div className="dtr-uploader">
            <div className="card">
              <div className="card-header">
                <h4>
                  {isEditingExistingBatch
                    ? `Add Files to Batch: ${selectedBatch?.batchName}`
                    : "Upload DTR Files"}
                </h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleUpload}>
                  <div className="row mb-3">
                    <div className="col-md-12">
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label
                              htmlFor="period-start"
                              className="form-label"
                            >
                              Period Start:
                            </label>
                            <Calendar
                              onChange={handleStartDateChange}
                              value={periodStart ? new Date(periodStart) : null}
                              className="custom-calendar"
                              locale="en-US"
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="period-end" className="form-label">
                              Period End:
                            </label>
                            <Calendar
                              onChange={handleEndDateChange}
                              value={periodEnd ? new Date(periodEnd) : null}
                              className="custom-calendar"
                              locale="en-US"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="batch-name" className="form-label">
                          Batch Name:
                        </label>
                        <div className="d-flex">
                          <input
                            id="batch-name"
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            placeholder="Enter batch name"
                            className="form-control"
                            required
                            readOnly={isEditingExistingBatch}
                          />
                          {!isEditingExistingBatch && (
                            <Button
                              variant="view"
                              size="sm"
                              onClick={generateBatchName}
                              type="button"
                              className="ms-2"
                            >
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="dtrFiles" className="form-label">
                      Select DTR Files:
                    </label>
                    <input
                      type="file"
                      id="dtrFiles"
                      className="form-control"
                      multiple
                      onChange={handleFileChange}
                      accept=".xlsx,.csv"
                      key={fileInputKey}
                      required
                    />
                    <div className="form-text mt-2">
                      <p className="mb-1">
                        <strong>Supported file formats:</strong>
                      </p>
                      <ol className="ps-3 mb-0">
                        <li className="mb-1">
                          <strong>Format 1:</strong> Excel/CSV (.xlsx, .csv) with headers
                          containing
                          <code className="ms-1">
                            AC-No., Name, DateTime, State
                          </code>{" "}
                          columns. The State field should have values like
                          "C/In" and "C/Out".
                        </li>
                        <li>
                          <strong>Format 2:</strong> Excel/CSV (.xlsx, .csv) without headers, where
                          the first column is employee ID and second column is
                          datetime. In/Out status is determined by sequence of
                          entries.
                        </li>
                      </ol>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mb-3">
                      <p>Selected {selectedFiles.length} file(s):</p>
                      <ul className="list-group">
                        {selectedFiles.map((file, index) => (
                          <li key={index} className="list-group-item">
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 d-flex gap-2">
                    <Button variant="save" type="submit" disabled={loading}>
                      {loading
                        ? "Uploading..."
                        : isEditingExistingBatch
                        ? "Add Files"
                        : "Upload Files"}
                    </Button>

                    {isEditingExistingBatch && (
                      <Button
                        variant="cancel"
                        type="button"
                        onClick={() => {
                          resetUploadForm();
                          setIsEditingExistingBatch(false);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      case "batches":
        return (
          <DTRBatchList
            batches={batches}
            onBatchSelect={handleBatchSelect}
            onViewBatch={handleViewBatch}
            onExportBatch={handleExportBatch}
            onDeleteBatch={handleDeleteBatch}
            onAddFilesToBatch={handleAddFilesToBatch}
          />
        );
      case "holidays":
        return <DTRHolidays />;
      case "report":
        if (viewMode === "batch-view") {
          return (
            <DTRBatchView batch={selectedBatch} onBack={handleBackToBatches} />
          );
        } else if (viewMode === "summary") {
          return (
            <div>
              <Button
                variant="secondary"
                onClick={handleBackToBatches}
                className="mb-3"
              >
                <i className="bi bi-arrow-left"></i> Back to Batches
              </Button>
              <DTRSummaryReport
                batch={selectedBatch}
                onEmployeeSelect={handleEmployeeSelect}
              />
            </div>
          );
        } else {
          return (
            <DTRDetailReport
              batch={selectedBatch}
              employeeId={selectedEmployee}
              onBackToSummary={handleBackToSummary}
            />
          );
        }
      default:
        return <div>Select a tab to get started</div>;
    }
  };

  return (
    <div className="dtr-container">
      <div className="dtr-header">
        <h2>Daily Time Record (DTR) Management</h2>
        <div className="dtr-tabs">
          <div
            className={`dtr-tab ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => handleTabClick("upload")}
          >
            {isEditingExistingBatch ? "Add Files" : "Upload Files"}
          </div>
          <div
            className={`dtr-tab ${activeTab === "batches" ? "active" : ""}`}
            onClick={() => handleTabClick("batches")}
          >
            View Batches
          </div>
          <div
            className={`dtr-tab ${activeTab === "holidays" ? "active" : ""}`}
            onClick={() => handleTabClick("holidays")}
          >
            Holidays
          </div>
          {selectedBatch && (
            <div
              className={`dtr-tab ${activeTab === "report" ? "active" : ""}`}
              onClick={() => handleTabClick("report")}
            >
              {viewMode === "summary"
                ? "Summary Report"
                : viewMode === "batch-view"
                ? "Batch View"
                : "Detail Report"}
            </div>
          )}
        </div>
      </div>

      <div className="dtr-content">{renderContent()}</div>
    </div>
  );
};

export default DTR;
