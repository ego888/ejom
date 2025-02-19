import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { ServerIP } from "../config";

const EditEmployee = () => {
  const { id } = useParams();
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    salary: "",
    category_id: "",
    active: false,
    sales: false,
    accounting: false,
    artist: false,
    production: false,
    operator: false,
    admin: false,
  });
  const [category, setCategory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch categories
    axios
      .get(`${ServerIP}/auth/category`)
      .then((result) => {
        if (result.data.Status) {
          setCategory(result.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log(err));

    // Fetch employee details
    axios
      .get(`${ServerIP}/auth/get_employee/${id}`)
      .then((result) => {
        if (result.data.Status) {
          const employeeData = result.data.Result[0];
          console.log("Fetched employee data:", employeeData); // Debug log
          setData({
            name: employeeData.name,
            email: employeeData.email,
            password: "",
            salary: employeeData.salary,
            category_id: employeeData.category_id,
            active: Boolean(employeeData.active),
            sales: Boolean(employeeData.sales),
            accounting: Boolean(employeeData.accounting),
            artist: Boolean(employeeData.artist),
            production: Boolean(employeeData.production),
            operator: Boolean(employeeData.operator),
            admin: Boolean(employeeData.admin),
          });
        }
      })
      .catch((err) => console.log(err));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting data:", data); // Debug log
    axios
      .put(`${ServerIP}/auth/employee/edit/${id}`, data)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/employee"); // Navigate to the manage employees screen after saving
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log(err));
  };

  const handleCancel = () => {
    navigate("/dashboard/employee"); // Navigate to the manage employees screen without making any changes
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-50 border">
        <h3 className="text-center">Edit Employee</h3>
        <form className="row g-1" onSubmit={handleSubmit}>
          <div className="col-12">
            <label htmlFor="inputName" className="form-label">
              Name
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="inputName"
              placeholder="Enter Name"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label htmlFor="inputEmail4" className="form-label">
              Email
            </label>
            <input
              type="email"
              className="form-control rounded-0"
              id="inputEmail4"
              placeholder="Enter Email"
              autoComplete="off"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>{" "}
          <div className="col-12">
            <label htmlFor="password" className="form-label">
              Password (leave blank to keep current)
            </label>
            <input
              type="password"
              name="password"
              id="password"
              className="form-control rounded-0"
              placeholder="Enter new password"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label htmlFor="inputSalary" className="form-label">
              Salary
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="inputSalary"
              placeholder="Enter Salary"
              autoComplete="off"
              value={data.salary}
              onChange={(e) => setData({ ...data, salary: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label htmlFor="inputAddress" className="form-label">
              Address
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="inputAddress"
              placeholder="1234 Main St"
              autoComplete="off"
              value={data.address}
              onChange={(e) => setData({ ...data, address: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <Dropdown
              variant="form"
              id="category"
              name="category"
              value={data.category_id || ""}
              onChange={(e) =>
                setData({
                  ...data,
                  category_id: parseInt(e.target.value),
                })
              }
              options={category}
              placeholder="Select Category"
              labelKey="name"
              valueKey="id"
            />
          </div>
          <div className="col-12 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="activeCheckbox"
              checked={data.active}
              onChange={(e) => setData({ ...data, active: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="activeCheckbox">
              Active
            </label>
          </div>
          <div className="col-12 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="salesCheckbox"
              checked={data.sales}
              onChange={(e) => setData({ ...data, sales: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="salesCheckbox">
              Sales
            </label>
          </div>
          <div className="col-12 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="accountingCheckbox"
              checked={data.accounting}
              onChange={(e) =>
                setData({ ...data, accounting: e.target.checked })
              }
            />
            <label className="form-check-label" htmlFor="accountingCheckbox">
              Accounting
            </label>
          </div>
          <div className="col-12 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="artistCheckbox"
              checked={data.artist}
              onChange={(e) => setData({ ...data, artist: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="artistCheckbox">
              Artist
            </label>
          </div>
          <div className="col-12 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="productionCheckbox"
              checked={data.production}
              onChange={(e) =>
                setData({ ...data, production: e.target.checked })
              }
            />
            <label className="form-check-label" htmlFor="productionCheckbox">
              Production
            </label>
          </div>
          <div className="col-12 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="operatorCheckbox"
              checked={data.operator}
              onChange={(e) => setData({ ...data, operator: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="operatorCheckbox">
              Operator
            </label>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="admin"
                checked={data.admin}
                onChange={(e) => setData({ ...data, admin: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="admin">
                Admin
              </label>
            </div>
          </div>
          <div className="col-12 d-flex justify-content-end gap-2">
            <Button variant="cancel" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Save Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployee;
