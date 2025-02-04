import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const Material = () => {
  const [material, setMaterial] = useState([]);
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

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Material List</h3>
      </div>
      <div className="d-flex justify-content-between align-items-center">
        <Button
          variant="add"
          onClick={() => navigate("/dashboard/material/add")}
        >
          Add Material
        </Button>
      </div>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th className="text-center">Material</th>
              <th className="text-center">Description</th>
              <th className="text-center">SqFt/Hour</th>
              <th className="text-center">Min Price</th>
              <th className="text-center">Fix Width</th>
              <th className="text-center">Fix Height</th>
              <th className="text-center">Cost</th>
              <th className="text-center">No Incentive</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {material.map((m) => (
              <tr key={m.id}>
                <td className="text-center">{m.Material}</td>
                <td className="text-center">{m.Description}</td>
                <td className="text-center">{m.SqFtPerHour}</td>
                <td className="text-center">${m.MinimumPrice}</td>
                <td className="text-center">{m.FixWidth}</td>
                <td className="text-center">{m.FixHeight}</td>
                <td className="text-center">${m.Cost}</td>
                <td className="text-center">{m.NoIncentive ? "Yes" : "No"}</td>
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

export default Material;
