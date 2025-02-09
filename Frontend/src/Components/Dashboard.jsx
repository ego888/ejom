import React, { useState, useEffect } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import axios from "../utils/axiosConfig"; // Import configured axios
import { jwtDecode } from "jwt-decode";
import AddOrder from "./AddOrder";
import "./Dashboard.css";
import { ServerIP } from "../config";
import logo from "../assets/Go Large logo 2009C2 small.jpg";

const Dashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Dashboard mounting...");
    const valid = localStorage.getItem("valid");
    console.log("Valid status:", valid);

    if (!valid) {
      console.log("No valid login found, redirecting...");
      navigate("/");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      console.log("Token found:", !!token);

      if (!token) {
        console.log("No token found, redirecting...");
        localStorage.removeItem("valid");
        navigate("/");
        return;
      }

      const decoded = jwtDecode(token);
      console.log("Token decoded, admin status:", decoded.isAdmin);
      setIsAdmin(decoded.isAdmin);
      setEmployeeName(decoded.name);
    } catch (error) {
      console.error("Token error:", error);
      localStorage.removeItem("valid");
      localStorage.removeItem("token");
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("valid");
    localStorage.removeItem("token");
    localStorage.removeItem("userName"); // ✅ Remove stored name
    navigate("/");
  };
  return (
    <div className="container-fluid">
      <div className="row flex-nowrap">
        <div className="col-auto col-md-2 col-xl-1 px-0 sidebar">
          <div className="d-flex flex-column align-items-center align-items-sm-start min-vh-100">
            <div className="sidebar-header">
              <img src={logo} alt="Company Logo" className="img-fluid mb-2" />
              <span className="fw-bolder">Job Order Monitoring System</span>
              <Link to="/dashboard" className="sidebar-user">
                <i className="bi bi-person-circle me-2"></i>
                <span className="fw-bolder d-none d-sm-inline">
                  {employeeName}
                </span>
              </Link>
            </div>
            <ul
              className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start"
              id="menu"
            >
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                  end
                >
                  <i className="bi-speedometer2"></i>
                  <span className="d-none d-sm-inline">Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/quotes"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-file-earmark-text"></i>
                  <span className="d-none d-sm-inline">Quotes</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/orders"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-cart"></i>
                  <span className="d-none d-sm-inline">Orders</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/prod"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-gear"></i>
                  <span className="d-none d-sm-inline">Prod</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/artistlog"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-palette"></i>
                  <span className="d-none d-sm-inline">Artist Log</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/printlog"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-printer"></i>
                  <span className="d-none d-sm-inline">Print Log</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/payment"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-cash"></i>
                  <span className="d-none d-sm-inline">Payments</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/client"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-building"></i>
                  <span className="d-none d-sm-inline">Clients</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/material"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-box-seam"></i>
                  <span className="d-none d-sm-inline">Materials</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/employee"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-people"></i>
                  <span className="d-none d-sm-inline">Employee</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/category"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-list"></i>
                  <span className="d-none d-sm-inline">Category</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/profile"
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className="bi-person"></i>
                  <span className="d-none d-sm-inline">Profile</span>
                </NavLink>
              </li>
              <li>
                <a href="#" className="sidebar-nav-link" onClick={handleLogout}>
                  <i className="bi-power"></i>
                  <span className="d-none d-sm-inline">Logout</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="col p-0 main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
