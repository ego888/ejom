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

  // Format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB");
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  // Format datetime to DD/MM/YYYY HH:MM
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;
    } catch (e) {
      console.error("Error formatting datetime:", dateString, e);
      return "Invalid DateTime";
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
                  <td>{batch.batchName || "Untitled Batch"}</td>
                  <td>
                    {formatDate(batch.periodStart)} -{" "}
                    {formatDate(batch.periodEnd)}
                  </td>
                  <td className="text-center">{batch.fileCount || 0}</td>
                  <td className="text-center">{batch.entryCount || 0}</td>
                  <td>{formatDateTime(batch.createdAt || batch.created_at)}</td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                      <Button
                        variant="add"
                        size="sm"
                        onClick={() => onAddFilesToBatch(batch)}
                        title="Add more files to this batch"
                      >
                        <i className="bi bi-plus-circle"></i> Add Files
                      </Button>
                      <Button
                        variant="view"
                        size="sm"
                        onClick={() => {
                          console.log("Selecting batch for report:", batch);
                          onBatchSelect(batch);
                        }}
                        title="View summary report"
                      >
                        <i className="bi bi-file-earmark-text"></i> Report
                      </Button>
                      <Button
                        variant="view"
                        size="sm"
                        onClick={() => onViewBatch(batch)}
                        title="View all entries in this batch"
                      >
                        <i className="bi bi-table"></i> View Batch
                      </Button>
                      <Button
                        variant="edit"
                        size="sm"
                        onClick={() => onExportBatch(batch)}
                        title="Export batch data as CSV"
                      >
                        <i className="bi bi-download"></i> Export
                      </Button>
                      <Button
                        variant="delete"
                        size="sm"
                        onClick={() => onDeleteBatch(batch)}
                        title="Delete this batch"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
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
