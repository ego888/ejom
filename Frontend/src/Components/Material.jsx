import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";
import { BiSortAlt2, BiSortUp, BiSortDown, BiSearch } from "react-icons/bi";

const Material = () => {
  const [material, setMaterial] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState({
    key: "Material",
    direction: "asc",
  });
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  useEffect(() => {
    axios
      .get(`${ServerIP}/auth/material`)
      .then((result) => {
        if (result.data.Status) {
          setMaterial(result.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to fetch materials",
          type: "alert",
        });
      });
  }, []);

  const handleDelete = (id) => {
    setAlert({
      show: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this material?",
      type: "confirm",
      onConfirm: () => {
        axios
          .delete(`${ServerIP}/auth/material/delete/${id}`)
          .then((result) => {
            if (result.data.Status) {
              window.location.reload();
            } else {
              setAlert({
                show: true,
                title: "Error",
                message: result.data.Error || "Failed to delete material",
                type: "alert",
              });
            }
          });
      },
    });
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) return <BiSortAlt2 />;
    return sortConfig.direction === "asc" ? <BiSortUp /> : <BiSortDown />;
  };

  const filteredAndSortedMaterials = React.useMemo(() => {
    let filteredData = [...material];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredData = filteredData.filter(
        (m) =>
          m.Material?.toLowerCase().includes(searchLower) ||
          m.Description?.toLowerCase().includes(searchLower) ||
          m.MaterialType?.toLowerCase().includes(searchLower) ||
          m.MachineType?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return filteredData;
  }, [material, sortConfig, searchTerm]);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Material List</h3>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button
          variant="add"
          onClick={() => navigate("/dashboard/material/add")}
        >
          Add Material
        </Button>
        <div className="d-flex align-items-center">
          <div className="input-group">
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search material, description, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("Material")}
              >
                Material {getSortIcon("Material")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("Description")}
              >
                Description {getSortIcon("Description")}
              </th>
              <th className="text-center">SqFt/Hour</th>
              <th className="text-center">Min Price</th>
              <th className="text-center">Fix Width</th>
              <th className="text-center">Fix Height</th>
              <th className="text-center">Cost</th>
              <th className="text-center">Unit Cost</th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("MaterialType")}
              >
                Material Type {getSortIcon("MaterialType")}
              </th>
              <th
                className="text-center cursor-pointer"
                onClick={() => handleSort("MachineType")}
              >
                Machine Type {getSortIcon("MachineType")}
              </th>
              <th className="text-center">No Incentive</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
        </table>

        <div className="table-scroll">
          <table className="table">
            <tbody>
              {filteredAndSortedMaterials.map((m) => (
                <tr key={m.id}>
                  <td className="text-center">{m.Material}</td>
                  <td className="text-center">{m.Description}</td>
                  <td className="text-center">{m.SqFtPerHour}</td>
                  <td className="text-center">${m.MinimumPrice}</td>
                  <td className="text-center">{m.FixWidth}</td>
                  <td className="text-center">{m.FixHeight}</td>
                  <td className="text-center">${m.Cost}</td>
                  <td className="text-center">${m.UnitCost}</td>
                  <td className="text-center">{m.MaterialType}</td>
                  <td className="text-center">{m.MachineType}</td>
                  <td className="text-center">
                    {m.NoIncentive ? "Yes" : "No"}
                  </td>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
                      <Button
                        variant="edit"
                        iconOnly
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/material/edit/${m.id}`)
                        }
                      />
                      <Button
                        variant="delete"
                        iconOnly
                        size="sm"
                        onClick={() => handleDelete(m.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
        onConfirm={() => {
          if (alert.onConfirm) {
            alert.onConfirm();
          }
          setAlert((prev) => ({ ...prev, show: false }));
        }}
      />

      <style>
        {`
          .table-container {
  position: relative;
  height: calc(100vh - 50px);
  overflow: hidden; /* Prevents entire container from scrolling */
          }

          .table-scroll {
  height: calc(100vh - 175px); /* Limits height to allow tbody scrolling */
  overflow-y: auto; /* Enables scrolling for tbody only */
          }

          .table {
            margin-bottom: 0;
          }

          .table thead {
  position: sticky;
  top: 0;
  z-index: 3;
  background-color: white;
          }

          .table thead tr {
            background-color: white;
            border-bottom: 2px solid #dee2e6;
          }

          .table thead th {
  background-color: white;
  z-index: 4;
          }

          .cursor-pointer {
            cursor: pointer;
          }

          .cursor-pointer:hover {
            background-color: #f8f9fa;
          }

          thead th {
            white-space: nowrap;
          }

          .input-group-text {
            border-right: 1px solid #ced4da;
          }

          .search-input {
            width: 300px;
          }
        `}
      </style>
    </div>
  );
};

export default Material;
