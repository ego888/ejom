import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import Modal from "./UI/Modal";

const CLIENT_SEARCH_KEY = "clientListSearch";

const Client = () => {
  const [clients, setClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState(
    () => localStorage.getItem(CLIENT_SEARCH_KEY) || ""
  );
  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem(CLIENT_SEARCH_KEY) || ""
  );
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
  const [holdNoteModal, setHoldNoteModal] = useState({
    open: false,
    client: null,
    note: "",
  });
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);
  const navigate = useNavigate();

  // Update admin check to use JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.categoryId === 1);
    }
  }, []);

  const fetchClients = useCallback(() => {
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
  }, [currentPage, recordsPerPage, searchTerm, sortConfig]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value);
        setCurrentPage(1);
        localStorage.setItem(CLIENT_SEARCH_KEY, value);
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    debouncedSearch.cancel();
    setSearchInput("");
    setSearchTerm("");
    setCurrentPage(1);
    localStorage.removeItem(CLIENT_SEARCH_KEY);
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = useCallback(
    (id) => {
      setAlert({
        show: true,
        title: "Confirm Delete",
        message: "Are you sure you want to delete this client?",
        type: "confirm",
        onConfirm: () => {
          axios
            .delete(`${ServerIP}/auth/client/delete/${id}`)
            .then((result) => {
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
    },
    [fetchClients]
  );

  const openHoldNoteModal = (client) => {
    setHoldNoteModal({ open: true, client, note: "" });
  };

  const closeHoldNoteModal = () => {
    setHoldNoteModal({ open: false, client: null, note: "" });
  };

  const handleHoldNoteSubmit = async () => {
    if (!holdNoteModal.client) return;

    try {
      setIsSubmittingHold(true);
      const payload = holdNoteModal.note.trim()
        ? { note: holdNoteModal.note.trim() }
        : {};

      const response = await axios.put(
        `${ServerIP}/auth/addWeek/${holdNoteModal.client.id}`,
        payload
      );

      if (response.data.Status) {
        closeHoldNoteModal();
        fetchClients();
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to add week to hold date",
          type: "alert",
        });
      }
    } catch (err) {
      setAlert({
        show: true,
        title: "Error",
        message: err.message || "Failed to add week to hold date",
        type: "alert",
      });
    } finally {
      setIsSubmittingHold(false);
    }
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
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                id="search"
                name="search"
                autoComplete="off"
                placeholder="Search clients..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ paddingRight: "2rem" }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="btn btn-sm btn-link text-muted"
                  style={{
                    position: "absolute",
                    right: "0.25rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    textDecoration: "none",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th className="align-middle text-center">
                <div
                  onClick={() => handleSort("clientName")}
                  style={{ cursor: "pointer" }}
                  className="fw-semibold"
                >
                  Client {getSortIcon("clientName")}
                </div>
              </th>
              <th className="d-none d-sm-table-cell align-middle text-center">
                Contact
              </th>
              <th className="d-none d-sm-table-cell align-middle text-center">
                Tel No
              </th>
              <th className="d-none d-sm-table-cell align-middle text-center">
                Email
              </th>
              <th
                onClick={() => handleSort("salesName")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell align-middle text-center"
              >
                Sales Person {getSortIcon("salesName")}
              </th>
              <th
                onClick={() => handleSort("terms")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell align-middle text-center"
              >
                Terms {getSortIcon("terms")}
              </th>
              <th
                onClick={() => handleSort("creditLimit")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell align-middle text-center"
              >
                Credit Limit {getSortIcon("creditLimit")}
                <div className="text-success small">Total orders</div>
              </th>
              <th className="align-middle text-center">
                <div
                  onClick={() => handleSort("over30")}
                  style={{ cursor: "pointer" }}
                  className="fw-semibold"
                >
                  Over 30 {getSortIcon("over30")}
                </div>
                <div className="text-success small">Billed</div>
              </th>
              <th
                onClick={() => handleSort("over60")}
                style={{ cursor: "pointer" }}
                className="align-middle text-center"
              >
                Over 60 {getSortIcon("over60")}
                <div className="text-success small">Billed</div>
              </th>
              <th className="align-middle text-center">
                <div
                  onClick={() => handleSort("over90")}
                  style={{ cursor: "pointer" }}
                  className="fw-semibold"
                >
                  Over 90 {getSortIcon("over90")}
                </div>
                <div className="text-success small">Billed</div>
              </th>
              <th
                onClick={() => handleSort("overdue")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell align-middle text-center"
              >
                Overdue {getSortIcon("overdue")}
              </th>
              <th
                onClick={() => handleSort("hold")}
                style={{ cursor: "pointer" }}
                className="d-none d-sm-table-cell align-middle text-center"
              >
                Hold {getSortIcon("hold")}
              </th>
              <th className="align-middle text-center">Action</th>
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
                    <div>{formatPesoZ(client.creditLimit)}</div>
                    <div className="text-success small">
                      {formatPesoZ(client.productionTotal)}
                    </div>
                  </td>
                  <td className="text-end">
                    <div>{formatPesoZ(client.over30)}</div>
                    <div className="text-success small">
                      {formatPesoZ(client.over30Billed)}
                    </div>
                  </td>
                  <td className="text-end">
                    <div>{formatPesoZ(client.over60)}</div>
                    <div className="text-success small">
                      {formatPesoZ(client.over60Billed)}
                    </div>
                  </td>
                  <td className="text-end">
                    <div>{formatPesoZ(client.over90)}</div>
                    <div className="text-success small">
                      {formatPesoZ(client.over90Billed)}
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
                            title="Add 1 day to Hold Date"
                            icon={<BsCalendar2Week size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openHoldNoteModal(client);
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

      <Modal
        show={holdNoteModal.open}
        size="sm"
        hideCloseButton
        onClose={() => {
          if (!isSubmittingHold) closeHoldNoteModal();
        }}
      >
        <div className="mb-3">
          <label htmlFor="hold-note" className="form-label">
            Log note
          </label>
          <textarea
            id="hold-note"
            className="form-control"
            rows={3}
            value={holdNoteModal.note}
            onChange={(e) =>
              setHoldNoteModal((prev) => ({
                ...prev,
                note: e.target.value,
              }))
            }
            placeholder="Enter note"
            disabled={isSubmittingHold}
          />
        </div>
        <div className="d-flex justify-content-end gap-2">
          <Button
            variant="cancel"
            onClick={closeHoldNoteModal}
            disabled={isSubmittingHold}
          >
            Cancel
          </Button>
          <Button
            variant="save"
            onClick={handleHoldNoteSubmit}
            disabled={isSubmittingHold}
          >
            {isSubmittingHold ? "Saving..." : "Save"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Client;
