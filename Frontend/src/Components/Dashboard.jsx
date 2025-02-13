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
  const [permissions, setPermissions] = useState({
    isAdmin: false,
    isSales: false,
    isAccounting: false,
    isArtist: false,
    isOperator: false,
    isActive: false,
    categoryId: null,
  });
  const [employeeName, setEmployeeName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Dashboard mounting...");
    const valid = localStorage.getItem("valid");

    if (!valid) {
      console.log("No valid login found, redirecting...");
      navigate("/");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found, redirecting...");
        localStorage.removeItem("valid");
        navigate("/");
        return;
      }

      const decoded = jwtDecode(token);

      const newPermissions = {
        isAdmin: decoded.categoryId === 1,
        isSales: decoded.sales === 1, // Add === 1 comparison
        isAccounting: decoded.accounting === 1, // Add === 1 comparison
        isArtist: decoded.artist === 1, // Add === 1 comparison
        isOperator: decoded.operator === 1, // Add === 1 comparison
        isActive: decoded.active === 1, // Add === 1 comparison
        categoryId: decoded.categoryId,
      };

      setPermissions(newPermissions);
      setEmployeeName(decoded.name);

      // Redirect to appropriate initial route if we're at /dashboard exactly
      if (window.location.pathname === "/dashboard") {
        navigate(getInitialRoute(newPermissions));
      }
    } catch (error) {
      console.error("Token error:", error);
      localStorage.removeItem("valid");
      localStorage.removeItem("token");
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyNavigation = (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission on Enter

        // Get all focusable form elements (input, select, textarea, button)
        const focusableElements = Array.from(
          document.querySelectorAll("input, select, textarea, button")
        );

        // Get the currently focused element
        const currentIndex = focusableElements.indexOf(document.activeElement);

        // Move focus to the next element
        if (
          currentIndex !== -1 &&
          currentIndex < focusableElements.length - 1
        ) {
          focusableElements[currentIndex + 1].focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyNavigation);
    return () => document.removeEventListener("keydown", handleKeyNavigation);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("valid");
    localStorage.removeItem("token");
    localStorage.removeItem("userName"); // ✅ Remove stored name
    navigate("/");
  };

  // Helper function to check route access
  const canAccessRoute = (route) => {
    if (permissions.categoryId === 1) {
      return true;
    }

    if (!permissions.isActive) {
      return false;
    }

    let hasAccess = false;
    switch (route) {
      case "quotes":
      case "orders":
        hasAccess = permissions.isSales;
        break;
      case "prod":
      case "payment":
        hasAccess = permissions.isAccounting;
        break;
      case "artistlog":
        hasAccess = permissions.isArtist;
        break;
      case "printlog":
        hasAccess = permissions.isOperator;
        break;
      case "dashboard":
      case "profile":
        hasAccess = true;
        break;
      default:
        hasAccess = false;
    }

    return hasAccess;
  };

  // Navigation items configuration
  const navItems = [
    { path: "", icon: "bi-speedometer2", text: "Dashboard", adminOnly: true },
    { path: "quotes", icon: "bi-file-earmark-text", text: "Quotes" },
    { path: "orders", icon: "bi-cart", text: "Orders" },
    { path: "prod", icon: "bi-gear", text: "Prod" },
    { path: "artistlog", icon: "bi-palette", text: "Artist Log" },
    { path: "printlog", icon: "bi-printer", text: "Print Log" },
    { path: "payment", icon: "bi-cash", text: "Payments" },
    {
      path: "reports",
      icon: "bi-file-earmark-ruled",
      text: "Reports",
    },
    { path: "client", icon: "bi-building", text: "Clients", adminOnly: true },
    {
      path: "material",
      icon: "bi-box-seam",
      text: "Materials",
      adminOnly: true,
    },
    { path: "employee", icon: "bi-people", text: "Employee", adminOnly: true },
    { path: "category", icon: "bi-list", text: "Category", adminOnly: true },
    { path: "profile", icon: "bi-person", text: "Profile", adminOnly: true },
  ];

  // Add function to determine initial route
  const getInitialRoute = (permissions) => {
    if (permissions.categoryId === 1) return "/dashboard";
    if (permissions.isSales) return "/dashboard/quotes";
    if (permissions.isAccounting) return "/dashboard/prod";
    if (permissions.isArtist) return "/dashboard/artistlog";
    if (permissions.isOperator) return "/dashboard/printlog";
    return "/dashboard/orders"; // fallback
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
              className="nav nav-pills flex-column mb-sm-auto mb-0 mt-4 align-items-center align-items-sm-start"
              id="menu"
            >
              {navItems.map((item) => {
                const hasAccess =
                  (item.adminOnly && permissions.categoryId === 1) ||
                  (!item.adminOnly && canAccessRoute(item.path));

                if (!hasAccess) {
                  return null;
                }

                if (item.subItems) {
                  return (
                    <li key={item.path} className="nav-item dropdown">
                      <a
                        className="sidebar-nav-link dropdown-toggle"
                        href="#"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className={`bi ${item.icon}`}></i>
                        <span className="d-none d-sm-inline">{item.text}</span>
                      </a>
                      <ul className="dropdown-menu">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.path}>
                            <NavLink
                              to={`/dashboard/reports/${subItem.path}`}
                              className={({ isActive }) =>
                                `dropdown-item ${isActive ? "active" : ""}`
                              }
                            >
                              {subItem.text}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path ? `/dashboard/${item.path}` : "/dashboard"}
                      className={({ isActive }) =>
                        `sidebar-nav-link ${isActive ? "active" : ""}`
                      }
                      end={item.path === ""}
                    >
                      <i className={`bi ${item.icon}`}></i>
                      <span className="d-none d-sm-inline">{item.text}</span>
                    </NavLink>
                  </li>
                );
              })}
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
