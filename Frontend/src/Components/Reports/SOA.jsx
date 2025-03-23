import React, { useState, useEffect } from "react";
import axios from "axios";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import { formatNumber, formatPeso } from "../../utils/orderUtils";
import "./Reports.css";
import Modal from "../UI/Modal";
import SOADetails from "./SOADetails";
import ModalCustom from "../UI/ModalCustom";
import { useNavigate } from "react-router-dom";

const SOA = () => {
  const [reportData, setReportData] = useState(null);
  const [alert, setAlert] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  const navigate = useNavigate();

  // Load data when component mounts
  useEffect(() => {
    loadSOAData();
  }, []);

  const loadSOAData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/statement-of-account`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        setReportData(response.data.Result);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error generating SOA:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to generate statement of account",
        type: "error",
      });
    }
  };

  const handleSort = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!reportData || !sortConfig.key) return reportData;

    return [...reportData].sort((a, b) => {
      if (sortConfig.key === "clientName") {
        return sortConfig.direction === "asc"
          ? a.clientName.localeCompare(b.clientName)
          : b.clientName.localeCompare(a.clientName);
      }

      return sortConfig.direction === "asc"
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
  };

  const handleShowDetails = async (clientId, category, amount) => {
    if (amount === 0) return;
    console.log("SOA clicked:", clientId, category, amount);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/soa-details`, {
        params: { clientId, category },
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("SOA response:", response.data);

      if (response.data.Status) {
        setDetailsData(response.data.Result);
        setDetailsTitle(
          `${
            category === "production"
              ? "Production"
              : category === "0-30"
              ? "0-30 Days"
              : category === "31-60"
              ? "31-60 Days"
              : category === "61-90"
              ? "61-90 Days"
              : category === "over90"
              ? "Over 90 Days"
              : "Total"
          } Details`
        );
        console.log("Setting showDetails to true");
        setShowDetails(true);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  };

  const handlePrintSOA = (clientId) => {
    window.open(`/dashboard/print_soa/${clientId}`, "_blank");
  };

  return (
    <div className="reports-content">
      <div className="d-flex justify-content-center pt-4">
        <h3>Statement of Account</h3>
      </div>

      {reportData && (
        <div className="report-summary-container">
          <div className="report-table-container">
            <table className="table table-hover report-table">
              <thead className="table-active">
                <tr>
                  <th
                    className="text-center"
                    onClick={() => handleSort("clientName")}
                    style={{ cursor: "pointer" }}
                  >
                    Client Name{" "}
                    {sortConfig.key === "clientName" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="text-center clickable"
                    onClick={() => handleSort("production")}
                    style={{ cursor: "pointer" }}
                  >
                    Production{" "}
                    {sortConfig.key === "production" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="text-center clickable"
                    onClick={() => handleSort("days_0_30")}
                    style={{ cursor: "pointer" }}
                  >
                    0-30 Days{" "}
                    {sortConfig.key === "days_0_30" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="text-center clickable"
                    onClick={() => handleSort("days_31_60")}
                    style={{ cursor: "pointer" }}
                  >
                    31-60 Days{" "}
                    {sortConfig.key === "days_31_60" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="text-center clickable"
                    onClick={() => handleSort("days_61_90")}
                    style={{ cursor: "pointer" }}
                  >
                    61-90 Days{" "}
                    {sortConfig.key === "days_61_90" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="text-center clickable"
                    onClick={() => handleSort("days_over_90")}
                    style={{ cursor: "pointer" }}
                  >
                    &gt;90 Days{" "}
                    {sortConfig.key === "days_over_90" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="text-center clickable"
                    onClick={() => handleSort("total_ar")}
                    style={{ cursor: "pointer" }}
                  >
                    Total AR{" "}
                    {sortConfig.key === "total_ar" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedData()?.map((row, index) => (
                  <tr key={index}>
                    <td
                      className="clickable"
                      onClick={() => handlePrintSOA(row.clientId)}
                      style={{ cursor: "pointer" }}
                    >
                      {row.clientName}
                    </td>
                    <td
                      className={`text-end ${
                        row.production > 0 ? "clickable" : ""
                      }`}
                      onClick={() =>
                        row.production > 0 &&
                        handleShowDetails(
                          row.clientId,
                          "production",
                          row.production
                        )
                      }
                      style={{
                        cursor: row.production > 0 ? "pointer" : "default",
                      }}
                    >
                      {row.production > 0
                        ? `₱${formatNumber(row.production)}`
                        : ""}
                    </td>
                    <td
                      className={`text-end ${
                        row.days_0_30 > 0 ? "clickable" : ""
                      }`}
                      onClick={() =>
                        row.days_0_30 > 0 &&
                        handleShowDetails(row.clientId, "0-30", row.days_0_30)
                      }
                      style={{
                        cursor: row.days_0_30 > 0 ? "pointer" : "default",
                      }}
                    >
                      {row.days_0_30 > 0
                        ? `₱${formatNumber(row.days_0_30)}`
                        : ""}
                    </td>
                    <td
                      className={`text-end ${
                        row.days_31_60 > 0 ? "clickable" : ""
                      }`}
                      onClick={() =>
                        row.days_31_60 > 0 &&
                        handleShowDetails(row.clientId, "31-60", row.days_31_60)
                      }
                      style={{
                        cursor: row.days_31_60 > 0 ? "pointer" : "default",
                      }}
                    >
                      {row.days_31_60 > 0
                        ? `₱${formatNumber(row.days_31_60)}`
                        : ""}
                    </td>
                    <td
                      className={`text-end ${
                        row.days_61_90 > 0 ? "clickable" : ""
                      }`}
                      onClick={() =>
                        row.days_61_90 > 0 &&
                        handleShowDetails(row.clientId, "61-90", row.days_61_90)
                      }
                      style={{
                        cursor: row.days_61_90 > 0 ? "pointer" : "default",
                      }}
                    >
                      {row.days_61_90 > 0
                        ? `₱${formatNumber(row.days_61_90)}`
                        : ""}
                    </td>
                    <td
                      className={`text-end ${
                        row.days_over_90 > 0 ? "clickable" : ""
                      }`}
                      onClick={() =>
                        row.days_over_90 > 0 &&
                        handleShowDetails(
                          row.clientId,
                          "over90",
                          row.days_over_90
                        )
                      }
                      style={{
                        cursor: row.days_over_90 > 0 ? "pointer" : "default",
                      }}
                    >
                      {row.days_over_90 > 0
                        ? `₱${formatNumber(row.days_over_90)}`
                        : ""}
                    </td>
                    <td
                      className={`text-end fw-bold ${
                        row.total_ar > 0 ? "clickable" : ""
                      }`}
                      onClick={() =>
                        row.total_ar > 0 &&
                        handleShowDetails(row.clientId, "total", row.total_ar)
                      }
                      style={{
                        cursor: row.total_ar > 0 ? "pointer" : "default",
                      }}
                    >
                      {row.total_ar > 0 ? `₱${formatNumber(row.total_ar)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-active">
                <tr>
                  <td className="text-end">Total:</td>
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      reportData.reduce((sum, row) => sum + row.production, 0)
                    )}
                  </td>
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      reportData.reduce((sum, row) => sum + row.days_0_30, 0)
                    )}
                  </td>
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      reportData.reduce((sum, row) => sum + row.days_31_60, 0)
                    )}
                  </td>
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      reportData.reduce((sum, row) => sum + row.days_61_90, 0)
                    )}
                  </td>
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      reportData.reduce((sum, row) => sum + row.days_over_90, 0)
                    )}
                  </td>
                  <td className="text-end">
                    ₱
                    {formatNumber(
                      reportData.reduce((sum, row) => sum + row.total_ar, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showDetails && detailsData && (
        <ModalCustom
          title={detailsTitle}
          onClose={() => {
            console.log("Closing modal");
            setShowDetails(false);
            setDetailsData(null);
          }}
          show={showDetails}
          width="95%"
          height="85%"
        >
          <SOADetails data={detailsData} />
        </ModalCustom>
      )}
    </div>
  );
};

export default SOA;
