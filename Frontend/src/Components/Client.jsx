import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import debounce from "lodash/debounce";
import { jwtDecode } from "jwt-decode";
import { BsCalendar2Week } from "react-icons/bs";
import {
  formatPeso,
  formatPesoZ,
  formatDate,
  formatDateInputValue,
} from "../utils/orderUtils";
import Modal from "./UI/Modal";

const CLIENT_SEARCH_KEY = "clientListSearch";
const CLIENT_SORT_KEY = "clientListSort";
const CLIENT_RECORDS_PER_PAGE_KEY = "clientListRecordsPerPage";
const CLIENT_CURRENT_PAGE_KEY = "clientListCurrentPage";

const DEFAULT_CLIENT_SORT = {
  key: null,
  direction: "ascending",
};

const getStoredPageSize = () => {
  const value = Number(localStorage.getItem(CLIENT_RECORDS_PER_PAGE_KEY));
  return [10, 25, 50, 100].includes(value) ? value : 10;
};

const getStoredCurrentPage = () => {
  const value = Number(localStorage.getItem(CLIENT_CURRENT_PAGE_KEY));
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const getStoredSortConfig = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLIENT_SORT_KEY) || "null");
    const validDirection =
      parsed?.direction === "ascending" || parsed?.direction === "descending";
    const validKey =
      parsed?.key === null || typeof parsed?.key === "string";

    if (validDirection && validKey) {
      return parsed;
    }
  } catch (error) {
    // Ignore malformed storage and fall back to defaults.
  }

  return DEFAULT_CLIENT_SORT;
};

const getDefaultHoldNoteDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateInputValue(date);
};
const formatHoldDateSafe = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return formatDate(value);
};

const Client = () => {
  const [clients, setClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(getStoredCurrentPage);
  const [recordsPerPage, setRecordsPerPage] = useState(getStoredPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState(
    () => localStorage.getItem(CLIENT_SEARCH_KEY) || "",
  );
  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem(CLIENT_SEARCH_KEY) || "",
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [savingTermsClientId, setSavingTermsClientId] = useState(null);
  const [sortConfig, setSortConfig] = useState(getStoredSortConfig);
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
    date: getDefaultHoldNoteDate(),
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

  useEffect(() => {
    axios
      .get(`${ServerIP}/auth/payment_terms`)
      .then((result) => {
        if (result.data.Status) {
          setPaymentTerms(result.data.Result || []);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error || "Failed to load payment terms",
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: err.message || "Failed to load payment terms",
          type: "alert",
        });
      });
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
        const trimmedValue = value.trim();
        setSearchTerm(trimmedValue);
        setCurrentPage(1);
        localStorage.setItem(CLIENT_SEARCH_KEY, trimmedValue);
      }, 300),
    [],
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

  const handleSearchFocus = (event) => {
    if (event.target.value) {
      event.target.select();
    }
  };

  const handleSearchMouseDown = (event) => {
    if (event.target.value && document.activeElement === event.target) {
      event.preventDefault();
      event.target.select();
    }
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

  useEffect(() => {
    localStorage.setItem(CLIENT_SORT_KEY, JSON.stringify(sortConfig));
  }, [sortConfig]);

  useEffect(() => {
    localStorage.setItem(
      CLIENT_RECORDS_PER_PAGE_KEY,
      String(recordsPerPage),
    );
  }, [recordsPerPage]);

  useEffect(() => {
    localStorage.setItem(CLIENT_CURRENT_PAGE_KEY, String(currentPage));
  }, [currentPage]);

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
    [fetchClients],
  );

  const handleTermsChange = async (client, newTerms) => {
    if (!isAdmin || newTerms === client.terms) return;

    try {
      setSavingTermsClientId(client.id);
      const result = await axios.put(
        `${ServerIP}/auth/client/${client.id}/terms`,
        { terms: newTerms },
      );

      if (result.data.Status) {
        setClients((prev) =>
          prev.map((item) =>
            item.id === client.id ? { ...item, terms: newTerms } : item,
          ),
        );
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: result.data.Error || "Failed to update terms",
          type: "alert",
        });
      }
    } catch (err) {
      setAlert({
        show: true,
        title: "Error",
        message: err.message || "Failed to update terms",
        type: "alert",
      });
    } finally {
      setSavingTermsClientId(null);
    }
  };

  const openHoldNoteModal = (client) => {
    setHoldNoteModal({
      open: true,
      client,
      date: getDefaultHoldNoteDate(),
      note: "",
    });
  };

  const handleHoldNoteKeyDown = (e) => {
    // Force Enter (any modifier) to add a newline instead of triggering modal-level handlers.
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget;
      const { selectionStart, selectionEnd, value } = target;
      const newValue =
        value.slice(0, selectionStart) + "\n" + value.slice(selectionEnd);

      setHoldNoteModal((prev) => ({ ...prev, note: newValue }));

      // Restore caret position after the state update so typing can continue smoothly.
      requestAnimationFrame(() => {
        const newPos = selectionStart + 1;
        if (target?.setSelectionRange) {
          target.setSelectionRange(newPos, newPos);
        } else {
          target.selectionStart = newPos;
          target.selectionEnd = newPos;
        }
        target.focus();
      });
    }
  };

  const closeHoldNoteModal = () => {
    setHoldNoteModal({
      open: false,
      client: null,
      date: getDefaultHoldNoteDate(),
      note: "",
    });
  };

  const handleHoldNoteSubmit = async () => {
    if (!holdNoteModal.client) return;

    try {
      setIsSubmittingHold(true);
      const trimmedNote = holdNoteModal.note.trim();
      const payload = {};

      if (holdNoteModal.date) {
        payload.date = holdNoteModal.date;
      }

      if (trimmedNote) {
        payload.note = trimmedNote;
      }

      const response = await axios.put(
        `${ServerIP}/auth/addWeek/${holdNoteModal.client.id}`,
        payload,
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
                onFocus={handleSearchFocus}
                onMouseDown={handleSearchMouseDown}
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
                    <button
                      type="button"
                      className="btn btn-link p-0 fw-semibold text-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem(
                          "ordersSearchTerm",
                          client.clientName || "",
                        );
                        navigate(`/dashboard/orders`, {
                          state: {
                            clientId: client.id,
                            clientName: client.clientName,
                          },
                        });
                      }}
                    >
                      {client.clientName}
                    </button>
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
                    {isAdmin ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Dropdown
                          variant="table"
                          size="small"
                          id={`terms-${client.id}`}
                          name={`terms-${client.id}`}
                          value={client.terms || ""}
                          onChange={(e) =>
                            handleTermsChange(client, e.target.value)
                          }
                          options={paymentTerms}
                          placeholder="Select Terms"
                          labelKey="terms"
                          valueKey="terms"
                          disabled={savingTermsClientId === client.id}
                          label={`Terms for ${client.clientName}`}
                        />
                      </div>
                    ) : (
                      client.terms
                    )}
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
        <div className="mb-2">
          <small className="text-muted">
            Hold date:{" "}
            {holdNoteModal.client?.hold
              ? formatHoldDateSafe(holdNoteModal.client.hold)
              : "N/A"}
          </small>
        </div>
        <div className="mb-3">
          <label htmlFor="hold-note-date" className="form-label">
            Date
          </label>
          <input
            id="hold-note-date"
            type="date"
            className="form-control"
            value={holdNoteModal.date}
            onChange={(e) =>
              setHoldNoteModal((prev) => ({
                ...prev,
                date: e.target.value,
              }))
            }
            disabled={isSubmittingHold}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="hold-note" className="form-label">
            Log note
          </label>
          <textarea
            id="hold-note"
            className="form-control"
            rows={3}
            value={holdNoteModal.note}
            onKeyDown={handleHoldNoteKeyDown}
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
