import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const Employee = () => {
  const [employee, setEmployee] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const navigate = useNavigate();
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  useEffect(() => {
    axios
      .get(`${ServerIP}/auth/employee`)
      .then((result) => {
        if (result.data.Status) {
          setEmployee(result.data.Result);
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
          message: "Failed to fetch employees",
          type: "alert",
        });
      });
  }, []);

  const handleDelete = (id) => {
    setAlert({
      show: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this employee?",
      type: "confirm",
      onConfirm: () => {
        axios
          .delete(`${ServerIP}/auth/employee/delete/${id}`)
          .then((result) => {
            if (result.data.Status) {
              window.location.reload();
            } else {
              setAlert({
                show: true,
                title: "Error",
                message: result.data.Error || "Failed to delete employee",
                type: "alert",
              });
            }
          });
      },
    });
  };

  const renderStatus = (status) => {
    return status ? (
      <span style={{ color: "green", fontWeight: "bold" }}>✓</span>
    ) : (
      <span style={{ color: "red" }}>✗</span>
    );
  };

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true, render: (row) => row.name },
      {
        key: "image",
        label: "Image",
        sortable: false,
        render: (row) => (
          <img
            src={`${ServerIP}/Images/` + row.image}
            alt=""
            className="employee_image"
          />
        ),
      },
      {
        key: "category_id",
        label: "Category ID",
        sortable: true,
        render: (row) => row.category_id,
      },
      { key: "active", label: "Active", sortable: true, render: (row) => renderStatus(row.active) },
      { key: "admin", label: "Admin", sortable: true, render: (row) => renderStatus(row.admin) },
      { key: "sales", label: "Sales", sortable: true, render: (row) => renderStatus(row.sales) },
      {
        key: "accounting",
        label: "Accounting",
        sortable: true,
        render: (row) => renderStatus(row.accounting),
      },
      { key: "artist", label: "Artist", sortable: true, render: (row) => renderStatus(row.artist) },
      {
        key: "production",
        label: "Production",
        sortable: true,
        render: (row) => renderStatus(row.production),
      },
      {
        key: "operator",
        label: "Operator",
        sortable: true,
        render: (row) => renderStatus(row.operator),
      },
      {
        key: "action",
        label: "Action",
        sortable: false,
        render: (row) => (
          <div className="d-flex justify-content-center gap-2">
            <Button
              variant="edit"
              iconOnly
              size="sm"
              onClick={() => navigate(`/dashboard/employee/edit/${row.id}`)}
            />
            <Button
              variant="delete"
              iconOnly
              size="sm"
              onClick={() => handleDelete(row.id)}
            />
          </div>
        ),
      },
    ],
    [navigate, handleDelete]
  );

  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key) return employee;

    const sortableData = [...employee];
    sortableData.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;

      // Handle booleans/numbers/strings
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aString = aVal ? aVal.toString().toLowerCase() : "";
      const bString = bVal ? bVal.toString().toLowerCase() : "";

      if (aString < bString) return sortConfig.direction === "asc" ? -1 : 1;
      if (aString > bString) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sortableData;
  }, [employee, sortConfig]);

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  return (
    <div className="px-5 py-3">
      <div className="d-flex justify-content-center">
        <h3>Employee List</h3>
      </div>
      <div className="d-flex justify-content-between align-items-center">
        <Button
          variant="add"
          onClick={() => navigate("/dashboard/employee/add")}
        >
          Add Employee
        </Button>
      </div>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="text-center"
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ cursor: column.sortable ? "pointer" : "default" }}
                >
                  {column.label}
                  {column.sortable && sortConfig.key === column.key && (
                    <span className="ms-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((row, index) => (
              <tr key={row.id ?? index}>
                {columns.map((column) => (
                  <td key={column.key} className="text-center">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default Employee;
