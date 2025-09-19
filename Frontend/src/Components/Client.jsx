import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import debounce from "lodash/debounce";
import { jwtDecode } from "jwt-decode";
import { BsCalendar2Week } from "react-icons/bs";
import { formatPeso, formatPesoZ, formatDate } from "../utils/orderUtils";

const Client = () => {
  const [clients, setClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });
  const navigate = useNavigate();

  // Update admin check to use JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.categoryId === 1);
    }
  }, []);

  const fetchClients = () => {
    axios
      .get(`${ServerIP}/auth/client-list`, {
        params: {
          page: currentPage,
          limit: recordsPerPage,
          search: searchTerm,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
        },
      })
      .then((result) => {
        if (result.data.Status) {
          setClients(result.data.Result);
          setTotalCount(result.data.totalCount);
          setTotalPages(Math.ceil(result.data.totalCount / recordsPerPage));
        }
      });
  };

  // Debounced search handler
  const debouncedSearch = debounce((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, 300);

  useEffect(() => {
    fetchClients();
  }, [currentPage, recordsPerPage, searchTerm, sortConfig]);

  const handleDelete = (id) => {
    setAlert({
      show: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this client?",
      type: "confirm",
      onConfirm: () => {
        axios.delete(`${ServerIP}/auth/client/delete/${id}`).then((result) => {
          if (result.data.Status) {
            fetchClients();
          } else {
            setAlert({
              show: true,
              title: "Error",
              message: result.data.Error || "Failed to delete client",
              type: "alert",
            });
          }
        });
      },
    });
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? "↑" : "↓";
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Client List</h3>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="add" onClick={() => navigate("/dashboard/client/add")}>
          Add Client
        </Button>

        <div className="d-flex gap-3 align-items-center">
          <div className="mb-3">
            <input
              type="text"
              className="form-input"
              id="search"
              name="search"
              autoComplete="off"
              placeholder="Search clients..."
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th className="align-top">
                <div
                  onClick={() => handleSort("clientName")}
                  style={{ cursor: "pointer" }}
                  className="fw-semibold"
                >
                  Client {getSortIcon("clientName")}
                </div>
              </th>
              <th className="d-none d-sm-table-cell">Contact</th>
              <th className="d-none d-sm-table-cell">Tel No</th>
              <th className="d-none d-sm-table-cell">Email</th>
              <th
                onClick={() => handleSort("salesName")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell"
              >
                Sales Person {getSortIcon("salesName")}
              </th>
              <th
                onClick={() => handleSort("terms")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell"
              >
                Terms {getSortIcon("terms")}
              </th>
              <th
                onClick={() => handleSort("creditLimit")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell"
              >
                Credit Limit {getSortIcon("creditLimit")}
              </th>
              <th className="align-top">
                <div
                  onClick={() => handleSort("over30")}
                  style={{ cursor: "pointer" }}
                  className="fw-semibold"
                >
                  Over 30 {getSortIcon("over30")}
                </div>
                <div className="text-muted small">Prod/Finished/Delivered</div>
              </th>
              <th
                onClick={() => handleSort("over60")}
                style={{ cursor: "pointer" }}
              >
                Over 60 {getSortIcon("over60")}
              </th>
              <th className="align-top">
                <div
                  onClick={() => handleSort("over90")}
                  style={{ cursor: "pointer" }}
                  className="fw-semibold"
                >
                  Over 90 {getSortIcon("over90")}
                </div>
                <div className="text-muted small">Billed</div>
              </th>
              <th
                onClick={() => handleSort("overdue")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell"
              >
                Overdue {getSortIcon("overdue")}
              </th>
              <th
                onClick={() => handleSort("hold")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell"
              >
                Hold {getSortIcon("hold")}
              </th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const currentDate = new Date();
              const holdDate = client.hold ? new Date(client.hold) : null;
              const overdueDate = client.overdue
                ? new Date(client.overdue)
                : null;

              const rowClass =
                holdDate && currentDate > holdDate
                  ? "table-danger"
                  : overdueDate && currentDate > overdueDate
                  ? "table-warning"
                  : "";

              return (
                <tr
                  key={client.id}
                  className={rowClass}
                  onClick={() =>
                    navigate(`/dashboard/client/edit/${client.id}`)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div>{client.clientName}</div>
                    {client.customerName && (
                      <div className="text-muted small">
                        {client.customerName}
                      </div>
                    )}
                  </td>
                  <td className="d-none d-sm-table-cell">{client.contact}</td>
                  <td className="d-none d-sm-table-cell">{client.telNo}</td>
                  <td className="d-none d-sm-table-cell">{client.email}</td>
                  <td className="text-center d-none d-sm-table-cell">
                    {client.salesName}
                  </td>
                  <td className="text-center d-none d-sm-table-cell">
                    {client.terms}
                  </td>
                  <td className="text-end d-none d-sm-table-cell">
                    {formatPesoZ(client.creditLimit)}
                  </td>
                  <td className="text-end">
                    <div>{formatPesoZ(client.over30)}</div>
                    <div className="text-muted small">
                      {formatPesoZ(client.productionTotal)}
                    </div>
                  </td>
                  <td className="text-end">{formatPesoZ(client.over60)}</td>
                  <td className="text-end">
                    <div>{formatPesoZ(client.over90)}</div>
                    <div className="text-muted small">
                      {formatPesoZ(client.billedTotal)}
                    </div>
                  </td>
                  <td className="text-center d-none d-sm-table-cell">
                    {client.overdue ? formatDate(client.overdue) : ""}
                  </td>
                  <td className="text-center d-none d-sm-table-cell">
                    {client.hold ? formatDate(client.hold) : ""}
                  </td>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            variant="delete"
                            iconOnly
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(client.id);
                            }}
                            className="d-none d-sm-table-cell"
                          />
                          <Button
                            variant="view"
                            iconOnly
                            size="sm"
                            title="Add 1 Week to Hold Date"
                            icon={<BsCalendar2Week size={14} />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await axios.put(
                                  `${ServerIP}/auth/addWeek/${client.id}`
                                );
                                if (response.data.Status) {
                                  fetchClients();
                                } else {
                                  setAlert({
                                    show: true,
                                    title: "Error",
                                    message:
                                      response.data.Error ||
                                      "Failed to add week to hold date",
                                    type: "alert",
                                  });
                                }
                              } catch (err) {
                                setAlert({
                                  show: true,
                                  title: "Error",
                                  message:
                                    err.message ||
                                    "Failed to add week to hold date",
                                  type: "alert",
                                });
                              }
                            }}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <DisplayPage
          recordsPerPage={recordsPerPage}
          setRecordsPerPage={setRecordsPerPage}
          currentPage={currentPage}
          totalCount={totalCount}
          setCurrentPage={setCurrentPage}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
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

export default Client;
