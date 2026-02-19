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
import "./Dashboard.css";
import { ServerIP } from "../config";
import logo from "../assets/Go Large logo 2009C2 small.jpg";
import ProfileUpdateModal from "./UI/ProfileUpdateModal";

// Menu item constants
const DASHBOARD = { path: "", icon: "bi-speedometer2", text: "Dashboard" };
const DASHSALES = {
  path: "dashsales",
  icon: "bi-speedometer2",
  text: "Sales Dashboard",
};
const DASHPROD = {
  path: "dashprod",
  icon: "bi-speedometer2",
  text: "Production Dashboard",
};
const QUOTES = {
  path: "quotes",
  icon: "bi-file-earmark-text",
  text: "Quotes",
};
const ORDERS = { path: "orders", icon: "bi-cart", text: "Orders" };
const DELIVERY_QR = {
  path: "delivery-qr",
  icon: "bi-qr-code-scan",
  text: "DeliveryQR",
};
const CLIENT = { path: "client", icon: "bi-building", text: "Clients" };
const PROD = { path: "prod", icon: "bi-gear", text: "Prod" };
const BILLING = { path: "billing", icon: "bi-receipt", text: "Billing" };
const WIPLOG = {
  path: "wiplog",
  icon: "bi-clipboard-check",
  text: "WIP Log",
};
const ARTISTLOG = {
  path: "artistlog",
  icon: "bi-palette",
  text: "Artist Log",
};
const PRINTLOG = {
  path: "printlog",
  icon: "bi-printer",
  text: "Print Log",
};
const PAYMENT = { path: "payment", icon: "bi-cash", text: "Payments" };
const PAYMENT_INQUIRY = {
  path: "payment-inquiry",
  icon: "bi-bank",
  text: "Payments Inquiry",
};
const INVOICE_INQUIRY = {
  path: "invoice-inquiry",
  icon: "bi-file-earmark-binary",
  text: "Invoice Inquiry",
};
const RECEIVE_PAYMENT = {
  path: "receive-payment",
  // icon: "bi-cash-coin",
  icon: "bi-safe",
  text: "Receive Payment",
};
const PROFILE = {
  path: "profile",
  icon: "bi-person",
  text: "Profile",
  isProfileModal: true,
};

// Submenu items constants
const SALES_REPORT = {
  path: "sales-report",
  icon: "bi-file-earmark-bar-graph",
  text: "Sales Report",
};
const SOA = {
  path: "soa",
  icon: "bi-file-text",
  text: "Statement of Account",
};
const ARTIST_INCENTIVES = {
  path: "artist-incentives",
  icon: "bi-file-easel",
  text: "Artist Incentives",
};
const SALES_INCENTIVES = {
  path: "sales-incentives",
  icon: "bi-file-plus",
  text: "Sales Incentives",
};
const MATERIAL_USAGE_REPORT = {
  path: "material-usage-report",
  icon: "bi-box-seam",
  text: "Material Usage Report",
};
const AVERAGE_PRICE_REPORT = {
  path: "average-price-report",
  icon: "bi-cash-coin",
  text: "Average Price",
};
const CHECK_ORDER_TOTAL = {
  path: "check-order-total",
  icon: "bi-box-seam",
  text: "Check Order Total",
};
const NOT_CLOSE = {
  path: "not-close",
  icon: "bi-x-circle",
  text: "Not Close",
};
const DTR_ABSENCES = {
  path: "dtr-absences",
  icon: "bi-person-dash",
  text: "DTR Absences",
};
const DTR_MONTHLY = {
  path: "dtr-monthly",
  icon: "bi-bar-chart-line",
  text: "DTR Monthly",
};

// Submenu for Reports
const REPORTS = {
  path: "reports",
  icon: "bi-file-earmark-ruled",
  text: "Reports",
  subItems: [
    SALES_REPORT,
    SOA,
    ARTIST_INCENTIVES,
    SALES_INCENTIVES,
    MATERIAL_USAGE_REPORT,
    AVERAGE_PRICE_REPORT,
    DTR_ABSENCES,
    DTR_MONTHLY,
    NOT_CLOSE,
    CHECK_ORDER_TOTAL,
  ],
};

// Submenu for Masterfiles
const MATERIAL = {
  path: "material",
  icon: "bi-box-seam",
  text: "Materials",
};
const EMPLOYEE = {
  path: "employee",
  icon: "bi-people",
  text: "Employee",
};
const CATEGORY = {
  path: "category",
  icon: "bi-list",
  text: "Category",
};
const EDIT_CONTROL = {
  path: "edit-control",
  icon: "bi-sliders",
  text: "JOM Control",
};

const MASTERFILES = {
  path: "masterfiles",
  icon: "bi-folder",
  text: "Masterfiles",
  subItems: [CLIENT, MATERIAL, EMPLOYEE, CATEGORY, EDIT_CONTROL],
};

// Reports submenus for different roles
const REPORTS_SALES = {
  ...REPORTS,
  subItems: [SALES_REPORT, SOA, DTR_ABSENCES, DTR_MONTHLY],
};

const REPORTS_PRODUCTION = {
  ...REPORTS,
  subItems: [
    MATERIAL_USAGE_REPORT,
    AVERAGE_PRICE_REPORT,
    DTR_ABSENCES,
    DTR_MONTHLY,
  ],
};

const DTR = { path: "dtr", icon: "bi-clock-history", text: "DTR" };

const Dashboard = () => {
  const [permissions, setPermissions] = useState({
    isAdmin: false,
    isSales: false,
    isAccounting: false,
    isProduction: false,
    isArtist: false,
    isOperator: false,
    isActive: false,
    categoryId: null,
  });
  const [employeeName, setEmployeeName] = useState(
    localStorage.getItem("userName") || "",
  );
  const [openSubmenu, setOpenSubmenu] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCompactView, setIsCompactView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 576 : false,
  );
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
        isSales: decoded.sales === 1,
        isAccounting: decoded.accounting === 1,
        isProduction: decoded.production === 1,
        isArtist: decoded.artist === 1,
        isOperator: decoded.operator === 1,
        isActive: decoded.active === 1,
        categoryId: decoded.categoryId,
      };

      setPermissions(newPermissions);
      setCurrentUserId(decoded.id);

      // Set employee name from decoded token and save to localStorage
      setEmployeeName(decoded.name);
      localStorage.setItem("userName", decoded.name);

      // Only redirect if we're at exactly /dashboard
      if (window.location.pathname === "/dashboard") {
        const initialRoute = getInitialRoute(newPermissions);
        navigate(initialRoute);
      }
    } catch (error) {
      console.error("Token error:", error);
      localStorage.removeItem("valid");
      localStorage.removeItem("token");
      navigate("/");
    }
  }, []); // Remove navigate from dependencies

  useEffect(() => {
    const handleKeyNavigation = (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission on Enter

        // Get all focusable form elements (input, select, textarea, button)
        const focusableElements = Array.from(
          document.querySelectorAll("input, select, textarea, button"),
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

  const handleProfileClick = (e) => {
    if (e) {
      e.preventDefault();
    }
    setShowProfileModal(true);
  };

  const handleProfileUpdate = (updatedName) => {
    setEmployeeName(updatedName);
    localStorage.setItem("userName", updatedName);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsCompactView(window.innerWidth <= 576);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get visible menu items based on user permissions
  const getVisibleMenuItems = () => {
    const items = [];

    if (permissions.isAdmin) {
      items.push(
        DASHBOARD,
        DASHSALES,
        DASHPROD,
        QUOTES,
        ORDERS,
        DELIVERY_QR,
        CLIENT,
        PROD,
        BILLING,
        WIPLOG,
        ARTISTLOG,
        PRINTLOG,
        PAYMENT,
        PAYMENT_INQUIRY,
        INVOICE_INQUIRY,
        RECEIVE_PAYMENT,
        REPORTS,
        MASTERFILES,
        DTR,
      );
    } else if (permissions.isSales) {
      items.push(DASHSALES, QUOTES, ORDERS, DELIVERY_QR, CLIENT, REPORTS_SALES);
    } else if (permissions.isAccounting) {
      items.push(
        DASHPROD,
        CLIENT,
        PROD,
        BILLING,
        WIPLOG,
        PAYMENT,
        PAYMENT_INQUIRY,
        INVOICE_INQUIRY,
        SOA,
        MATERIAL_USAGE_REPORT,
        AVERAGE_PRICE_REPORT,
        DTR_ABSENCES,
        DTR_MONTHLY,
      );
    } else if (permissions.isOperator) {
      items.push(PRINTLOG, WIPLOG, DELIVERY_QR);
    } else if (permissions.isProduction) {
      items.push(WIPLOG, DELIVERY_QR);
    } else if (permissions.isArtist) {
      items.push(ARTISTLOG, DTR_ABSENCES, DTR_MONTHLY);
    }

    if (
      isCompactView ||
      (!permissions.isProduction && !permissions.isOperator)
    ) {
      items.push(PROFILE);
    }
    return items;
  };

  // Add function to determine initial route
  const getInitialRoute = (permissions) => {
    if (permissions.categoryId === 1) return "/dashboard";
    if (permissions.isSales) return "/dashboard/quotes";
    if (permissions.isAccounting) return "/dashboard/dashprod";
    if (permissions.isOperator) return "/dashboard/printlog";
    if (permissions.isProduction) return "/dashboard/wiplog";
    if (permissions.isArtist) return "/dashboard/artistlog";
    return "/dashboard/orders"; // fallback
  };

  // Toggle submenu function
  const toggleSubmenu = (path) => {
    setOpenSubmenu(openSubmenu === path ? "" : path);
  };

  // Close mobile menu on navigation (mobile only)
  const handleNavClick = () => {
    if (window.innerWidth <= 576) {
      setMobileMenuOpen(false);
    }
  };

  // Get the filtered navigation items based on permissions
  const visibleNavItems = getVisibleMenuItems();

  return (
    <div className="container-fluid">
      <div className="row flex-nowrap">
        <div
          className={`col-auto col-md-2 col-xl-1 px-0 sidebar ${
            mobileMenuOpen ? "open" : ""
          }`}
        >
          <div className="d-flex flex-column h-100">
            <div className="sidebar-header position-sticky top-0 bg-white">
              <img src={logo} alt="Company Logo" className="img-fluid mb-2" />
              <span className="fw-bolder">Job Order Monitoring System</span>
              <a href="#" className="sidebar-user" onClick={handleProfileClick}>
                <i className="sidebar-user-icon bi bi-person-circle me-2"></i>
                <span className="fw-bolder d-none d-sm-inline">
                  {employeeName}
                </span>
              </a>
            </div>
            <div className="sidebar-nav-scroll">
              <ul
                className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start"
                id="menu"
              >
                {visibleNavItems.map((item) => {
                  if (item.isProfileModal) {
                    return (
                      <li key="profile-modal">
                        <a
                          href="#"
                          className="sidebar-nav-link"
                          onClick={(e) => {
                            handleProfileClick(e);
                            handleNavClick();
                          }}
                        >
                          <i className={`bi ${item.icon}`}></i>
                          <span className="d-none d-sm-inline">
                            {item.text}
                          </span>
                        </a>
                      </li>
                    );
                  }

                  if (item.subItems) {
                    return (
                      <li key={item.path} className="w-100">
                        <a
                          href="#"
                          className="sidebar-nav-link"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSubmenu(item.path);
                          }}
                        >
                          <i className={`bi ${item.icon}`}></i>
                          <span className="d-none d-sm-inline">
                            {item.text}
                          </span>
                          <i
                            className={`bi ${
                              openSubmenu === item.path
                                ? "bi-chevron-down"
                                : "bi-chevron-right"
                            } ms-2`}
                          ></i>
                        </a>
                        <ul
                          className={`nav flex-column ms-3 ${
                            openSubmenu === item.path ? "d-block" : "d-none"
                          }`}
                        >
                          {item.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <NavLink
                                to={`/dashboard/${subItem.path}`}
                                className={({ isActive }) =>
                                  `sidebar-nav-link ${isActive ? "active" : ""}`
                                }
                                onClick={handleNavClick}
                              >
                                <i className={`bi ${subItem.icon}`}></i>
                                <span className="d-none d-sm-inline">
                                  {subItem.text}
                                </span>
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
                        to={
                          item.path ? `/dashboard/${item.path}` : "/dashboard"
                        }
                        className={({ isActive }) =>
                          `sidebar-nav-link ${isActive ? "active" : ""}`
                        }
                        end={item.path === ""}
                        onClick={handleNavClick}
                      >
                        <i className={`bi ${item.icon}`}></i>
                        <span className="d-none d-sm-inline">{item.text}</span>
                      </NavLink>
                    </li>
                  );
                })}
                <li>
                  <a
                    href="#"
                    className="sidebar-nav-link"
                    onClick={() => {
                      handleLogout();
                      handleNavClick();
                    }}
                  >
                    <i className="bi-power"></i>
                    <span className="d-none d-sm-inline">Logout</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div
            className="mobile-overlay d-sm-none"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
        )}
        <div className="col p-0 main-content">
          {/* Mobile menu toggle button */}
          <button
            type="button"
            className="btn btn-link mobile-menu-toggle d-sm-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <i className="bi bi-list" style={{ fontSize: "1.6rem" }}></i>
          </button>
          <Outlet />
        </div>
      </div>

      {showProfileModal && currentUserId && (
        <ProfileUpdateModal
          show={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userId={currentUserId}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Dashboard;
