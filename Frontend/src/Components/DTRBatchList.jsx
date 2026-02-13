import React from "react";
import Button from "./UI/Button";

const DTRBatchList = ({
  batches,
  onBatchSelect,
  onViewBatch,
  onExportBatch,
  onDeleteBatch,
  onAddFilesToBatch,
}) => {
  console.log("DTRBatchList received batches:", batches);

  // Format date to MM/DD/YY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const raw = String(dateString).trim();
      // Only short-circuit true date-only strings to avoid timezone shifts.
      const dateOnlyMatch = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
      if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return `${month}/${day}/${year.slice(-2)}`;
      }

      // Also handle date-only prefix from API values like "YYYY-MM-DD 00:00:00"
      // without a timezone marker.
      const datePrefixNoTzMatch = raw.match(
        /^(\d{4})[-/](\d{2})[-/](\d{2})\s+\d{2}:\d{2}:\d{2}$/
      );
      if (datePrefixNoTzMatch) {
        const [, year, month, day] = datePrefixNoTzMatch;
        return `${month}/${day}/${year.slice(-2)}`;
      }

      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        return "N/A";
      }

      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${month}/${day}/${year}`;
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "N/A";
    }
  };

  // Format datetime to MM/DD/YY HH:MM
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return "N/A";
      }
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${month}/${day}/${year} ${hours}:${minutes}`;
    } catch (e) {
      console.error("Error formatting datetime:", dateString, e);
      return "N/A";
    }
  };

  // Handle empty batches array
  if (!batches) {
    console.warn("DTRBatchList received null or undefined batches");
    return (
      <div className="dtr-batch-list">
        <h3>DTR Batches</h3>
        <div className="alert alert-warning mt-3">
          No batch data available. Please check the API connection.
        </div>
      </div>
    );
  }

  // Log each batch for debugging
  if (batches.length > 0) {
    console.log("First batch details:", batches[0]);
  } else {
    console.log("No batches available");
  }

  return (
    <div className="dtr-batch-list">
      <h3>DTR Batches</h3>

      {batches.length === 0 ? (
        <div className="alert alert-info mt-3">
          No DTR batches found. Upload files to create a new batch.
        </div>
      ) : (
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Batch ID</th>
                <th>Batch Name</th>
                <th>Period</th>
                <th>File Count</th>
                <th>Entry Count</th>
                <th>Uploaded</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, index) => (
                <tr key={batch.id || index}>
                  <td>{batch.id || index}</td>
                  <td>{batch.batchName || "Untitled Batch"}</td>
                  <td>
                    {formatDate(batch.periodStart)} -{" "}
                    {formatDate(batch.periodEnd)}
                  </td>
                  <td className="text-center">{batch.fileCount || 0}</td>
                  <td className="text-center">{batch.entryCount || 0}</td>
                  <td>{formatDateTime(batch.createdAt)}</td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                      {(() => {
                        const createdAt = new Date(batch.createdAt); // ensure Date object
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                        if (createdAt > oneMonthAgo) {
                          return (
                            <Button
                              variant="add"
                              size="sm"
                              onClick={() => onAddFilesToBatch(batch)}
                              title="Add more files to this batch"
                            >
                              <i className="bi bi-plus-circle"></i> Add Files
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button
                        variant="view"
                        size="sm"
                        onClick={() => onViewBatch(batch)}
                        title="View all entries in this batch"
                      >
                        <i className="bi bi-table"></i> View Batch
                      </Button>
                      {(() => {
                        const createdAt = new Date(batch.createdAt); // ensure Date object
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                        if (createdAt > oneMonthAgo) {
                          return (
                            <Button
                              variant="delete"
                              size="sm"
                              onClick={() => onDeleteBatch(batch)}
                              title="Delete this batch"
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DTRBatchList;
