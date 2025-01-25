import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";

const EmployeeDetail = () => {
  const [employee, setEmployee] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${ServerIP}/employee/detail/${id}`)
      .then((result) => {
        setEmployee(result.data[0]);
      })
      .catch((err) => console.log(err));
  }, []);

  const handleLogout = () => {
    axios
      .get(`${ServerIP}/employee/logout`)
      .then((result) => {
        if (result.data.Status) {
          localStorage.removeItem("valid");
          navigate("/");
        }
      })
      .catch((err) => console.log(err));
  };

  return (
    <div>
      <div className="p-2 d-flex justify-content-center shadow">
        <h4>Employee Management System</h4>
      </div>
      <div className="d-flex justify-content-center flex-column align-items-center mt-3">
        <img
          src={`${ServerIP}/Images/` + employee.image}
          className="emp_det_image"
          alt={employee.name}
        />
        <div className="d-flex align-items-center flex-column mt-5">
          <h3>Name: {employee.name}</h3>
          <h3>Email: {employee.email}</h3>
          <h3>Salary: ${employee.salary}</h3>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="edit"
            onClick={() => navigate(`/dashboard/employee/edit/${employee.id}`)}
          >
            Edit
          </Button>
          <Button variant="cancel" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
