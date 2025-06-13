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

const Client = () => {
  const [clients, setClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
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
  }, [currentPage, recordsPerPage, searchTerm]);

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
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Customer Name</th>
              <th>Contact</th>
              <th>Tel No</th>
              <th>Email</th>
              <th>Sales Person</th>
              <th>Credit Limit</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.clientName}</td>
                <td>{client.customerName}</td>
                <td>{client.contact}</td>
                <td>{client.telNo}</td>
                <td>{client.email}</td>
                <td>{client.salesName}</td>
                <td>${client.creditLimit}</td>
                <td>
                  <div className="d-flex justify-content-center gap-2">
                    <Button
                      variant="edit"
                      iconOnly
                      size="sm"
                      onClick={() =>
                        navigate(`/dashboard/client/edit/${client.id}`)
                      }
                    />
                    {isAdmin && (
                      <>
                        <Button
                          variant="delete"
                          iconOnly
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                        />
                        <Button
                          variant="view"
                          iconOnly
                          size="sm"
                          title="Add 1 Week to Hold Date"
                          icon={<BsCalendar2Week size={14} />}
                          onClick={async () => {
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
            ))}
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
