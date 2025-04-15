// import React, { useState, useRef } from "react";
// import axios from "../utils/axiosConfig";
// import { ServerIP } from "../config";
// import Button from "./UI/Button";
// import ModalAlert from "./UI/ModalAlert";

// const DTRUploader = ({ onUploadSuccess }) => {
//   const [files, setFiles] = useState([]);
//   const [isDragging, setIsDragging] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [periodStart, setPeriodStart] = useState("");
//   const [periodEnd, setPeriodEnd] = useState("");
//   const [batchName, setBatchName] = useState("");
//   const [alert, setAlert] = useState({ show: false, message: "", type: "" });
//   const fileInputRef = useRef(null);

//   // Format file size for display
//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return "0 Bytes";
//     const k = 1024;
//     const sizes = ["Bytes", "KB", "MB", "GB"];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
//   };

//   // Handle file selection
//   const handleFileChange = (e) => {
//     const selectedFiles = Array.from(e.target.files);
//     validateAndAddFiles(selectedFiles);
//   };

//   // Handle drag and drop events
//   const handleDragOver = (e) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = () => {
//     setIsDragging(false);
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setIsDragging(false);

//     const droppedFiles = Array.from(e.dataTransfer.files);
//     validateAndAddFiles(droppedFiles);
//   };

//   // Validate file types and add to state
//   const validateAndAddFiles = (newFiles) => {
//     const validFiles = newFiles.filter((file) => {
//       const extension = file.name.split(".").pop().toLowerCase();
//       return ["xlsx", "xls", "csv"].includes(extension);
//     });

//     if (validFiles.length !== newFiles.length) {
//       setAlert({
//         show: true,
//         message:
//           "Some files were rejected. Only Excel (.xlsx, .xls) and CSV files are allowed.",
//         type: "warning",
//       });
//     }

//     setFiles((prevFiles) => [...prevFiles, ...validFiles]);
//   };

//   // Remove a file from the list
//   const removeFile = (index) => {
//     setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
//   };

//   // Open file dialog when drop area is clicked
//   const handleAreaClick = () => {
//     fileInputRef.current.click();
//   };

//   // Generate a default batch name
//   const generateBatchName = () => {
//     const now = new Date();
//     const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1)
//       .toString()
//       .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
//     setBatchName(`DTR Batch ${formattedDate}`);
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Validate form inputs
//     if (!files.length) {
//       setAlert({
//         show: true,
//         message: "Please select at least one file to upload.",
//         type: "error",
//       });
//       return;
//     }

//     if (!periodStart || !periodEnd) {
//       setAlert({
//         show: true,
//         message: "Please select the period start and end dates.",
//         type: "error",
//       });
//       return;
//     }

//     if (!batchName.trim()) {
//       setAlert({
//         show: true,
//         message: "Please enter a batch name.",
//         type: "error",
//       });
//       return;
//     }

//     // Create form data
//     const formData = new FormData();
//     files.forEach((file) => {
//       formData.append("dtrFiles", file);
//     });
//     formData.append("periodStart", periodStart);
//     formData.append("periodEnd", periodEnd);
//     formData.append("batchName", batchName);

//     try {
//       setUploading(true);

//       const response = await axios.post(
//         `${ServerIP}/auth/dtr/upload`,
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         }
//       );

//       if (response.data.Status) {
//         setAlert({
//           show: true,
//           message: `Successfully uploaded ${files.length} files. ${response.data.Message}`,
//           type: "success",
//         });

//         // Clear form
//         setFiles([]);
//         setPeriodStart("");
//         setPeriodEnd("");
//         setBatchName("");

//         // Notify parent component
//         onUploadSuccess();
//       } else {
//         throw new Error(response.data.Error || "Failed to upload files");
//       }
//     } catch (error) {
//       console.error("Upload error:", error);
//       setAlert({
//         show: true,
//         message: `Upload failed: ${error.message}`,
//         type: "error",
//       });
//     } finally {
//       setUploading(false);
//     }
//   };

//   return (
//     <div className="dtr-uploader">
//       <form onSubmit={handleSubmit}>
//         <div className="period-selectors">
//           <div>
//             <label htmlFor="period-start">Period Start:</label>
//             <input
//               id="period-start"
//               type="date"
//               value={periodStart}
//               onChange={(e) => setPeriodStart(e.target.value)}
//               className="form-control"
//             />
//           </div>

//           <div>
//             <label htmlFor="period-end">Period End:</label>
//             <input
//               id="period-end"
//               type="date"
//               value={periodEnd}
//               onChange={(e) => setPeriodEnd(e.target.value)}
//               className="form-control"
//             />
//           </div>
//           <div>
//             <label htmlFor="batch-name">Batch Name:</label>
//             <input
//               id="batch-name"
//               type="text"
//               value={batchName}
//               onChange={(e) => setBatchName(e.target.value)}
//               placeholder="Enter batch name"
//               className="form-control"
//             />
//             <Button
//               variant="view"
//               size="sm"
//               onClick={generateBatchName}
//               type="button"
//               style={{ marginLeft: "10px" }}
//             >
//               Generate
//             </Button>
//           </div>
//         </div>

//         <div
//           className={`file-drop-area ${isDragging ? "active" : ""}`}
//           onDragOver={handleDragOver}
//           onDragLeave={handleDragLeave}
//           onDrop={handleDrop}
//           onClick={handleAreaClick}
//         >
//           <input
//             type="file"
//             ref={fileInputRef}
//             className="file-input"
//             onChange={handleFileChange}
//             multiple
//             accept=".xlsx,.xls,.csv"
//           />

//           <div className="drop-message">
//             <i
//               className="bi bi-cloud-upload"
//               style={{ fontSize: "3rem", marginBottom: "10px" }}
//             ></i>
//             <p>Drag & drop files here, or click to select files</p>
//             <p className="small">Supports Excel (.xlsx, .xls) and CSV files</p>
//           </div>
//         </div>

//         {files.length > 0 && (
//           <div className="selected-files">
//             <h5>Selected Files ({files.length})</h5>
//             <ul className="file-list">
//               {files.map((file, index) => (
//                 <li key={index} className="file-item">
//                   <div className="file-item-name">{file.name}</div>
//                   <div className="file-item-info">
//                     <span className="file-item-size">
//                       {formatFileSize(file.size)}
//                     </span>
//                     <Button
//                       variant="delete"
//                       iconOnly
//                       size="sm"
//                       onClick={() => removeFile(index)}
//                       type="button"
//                     >
//                       <i className="bi bi-x"></i>
//                     </Button>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         <div className="upload-controls">
//           <Button
//             variant="cancel"
//             onClick={() => {
//               setFiles([]);
//               setPeriodStart("");
//               setPeriodEnd("");
//               setBatchName("");
//             }}
//             type="button"
//             disabled={uploading}
//           >
//             Clear
//           </Button>

//           <Button
//             variant="save"
//             type="submit"
//             disabled={uploading || files.length === 0}
//           >
//             {uploading ? "Uploading..." : "Upload Files"}
//           </Button>
//         </div>
//       </form>

//       <ModalAlert
//         show={alert.show}
//         title={
//           alert.type === "success"
//             ? "Success"
//             : alert.type === "warning"
//             ? "Warning"
//             : "Error"
//         }
//         message={alert.message}
//         type={alert.type}
//         onClose={() => setAlert({ ...alert, show: false })}
//       />
//     </div>
//   );
// };

// export default DTRUploader;
