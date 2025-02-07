import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const Client = () => {
  const [clients, setClients] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  useEffect(() => {
    axios.get(`${ServerIP}/auth/client`).then((result) => {
      if (result.data.Status) {
        setClients(result.data.Result);
      }
    });
  }, []);

  const handleDelete = (id) => {
    setAlert({
      show: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this client?",
      type: "confirm",
      onConfirm: () => {
        axios.delete(`${ServerIP}/auth/client/delete/${id}`).then((result) => {
          if (result.data.Status) {
            window.location.reload();
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
      <div className="d-flex justify-content-between align-items-center">
        <Button
          variant="add"
          onClick={() => (window.location.href = "/dashboard/client/add")}
        >
          Add Client
        </Button>
      </div>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Client Name</th>
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
                        (window.location.href = `/dashboard/client/edit/${client.id}`)
                      }
                    />
                    <Button
                      variant="delete"
                      iconOnly
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                    />
                  </div>
                </td>
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

export default Client;
