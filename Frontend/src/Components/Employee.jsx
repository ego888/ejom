import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Employee = () => {
  const [employee, setEmployee] = useState([]);
  const navigate = useNavigate()

  useEffect(() => {
    axios
      .get("http://localhost:3000/auth/employee")
      .then((result) => {
        if (result.data.Status) {
          setEmployee(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
  }, []);
  const handleDelete = (id) => {
    axios.delete('http://localhost:3000/auth/delete_employee/'+id)
    .then(result => {
        if(result.data.Status) {
            window.location.reload()
        } else {
            alert(result.data.Error)
        }
    })
  } 

  const renderStatus = (status) => {
    return status ? 
        <span style={{ color: 'green', fontWeight: 'bold' }}>✓</span> : 
        <span style={{ color: 'red' }}>✗</span>
  }

  return (
    <div className="px-5 py-3">
      <div className="d-flex justify-content-center">
        <h3>Employee List</h3>
      </div>
      <Link to="/dashboard/add_employee" className="btn btn-success">
        Add Employee
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th className="text-center">Name</th>
              <th className="text-center">Image</th>
              <th className="text-center">Category ID</th>
              <th className="text-center">Active</th>
              <th className="text-center">Admin</th>
              <th className="text-center">Sales</th>
              <th className="text-center">Accounting</th>
              <th className="text-center">Artist</th>
              <th className="text-center">Production</th>
              <th className="text-center">Operator</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {employee.map((e, index) => (
              <tr key={e.id || index}>
                <td className="text-center">{e.name}</td>
                <td className="text-center">
                  <img
                    src={`http://localhost:3000/Images/` + e.image}
                    alt=""
                    className="employee_image"
                  />
                </td>
                <td className="text-center">{e.category_id}</td>
                <td className="text-center">{renderStatus(e.active)}</td>
                <td className="text-center">{renderStatus(e.admin)}</td>
                <td className="text-center">{renderStatus(e.sales)}</td>
                <td className="text-center">{renderStatus(e.accounting)}</td>
                <td className="text-center">{renderStatus(e.artist)}</td>
                <td className="text-center">{renderStatus(e.production)}</td>
                <td className="text-center">{renderStatus(e.operator)}</td>
                <td className="text-center">
                  <Link
                    to={`/dashboard/edit_employee/` + e.id}
                    className="btn btn-info btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(e.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Employee;
