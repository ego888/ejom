import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { formatPeso } from "../utils/orderUtils";
import SalesGauge from "./UI/SalesGauge";
import "./Dashboard.css";

const DashProd = () => {
  const [productionStats, setProductionStats] = useState({
    total: 0,
    printed: 0,
    inProduction: 0,
    finished: 0,
    delivered: 0,
    billed: 0,
  });

  const [recentProductions, setRecentProductions] = useState([]);
  const [overdueProductions, setOverdueProductions] = useState([]);
  const [monthlyProduction, setMonthlyProduction] = useState({
    totalProduction: 0,
    totalBilled: 0,
  });
  const [userPermissions, setUserPermissions] = useState({
    isAdmin: false,
    isProduction: false,
    isBilling: false,
  });

  useEffect(() => {
    // Set user permissions from token
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setUserPermissions({
        isAdmin: decoded.categoryId === 1,
        isProduction: decoded.operator === 1,
        isBilling: decoded.accounting === 1,
      });
    }

    // Fetch dashboard data
    fetchProductionStats();
    fetchRecentProductions();
    fetchOverdueProductions();
    fetchMonthlyProduction();
  }, []);

  const fetchProductionStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/production_stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setProductionStats(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching production stats:", error);
    }
  };

  const fetchRecentProductions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/recent_productions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setRecentProductions(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching recent productions:", error);
    }
  };

  const fetchOverdueProductions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/overdue_productions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setOverdueProductions(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching overdue productions:", error);
    }
  };

  const fetchMonthlyProduction = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/monthly_production`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setMonthlyProduction(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching monthly production:", error);
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get current month name
  const getCurrentMonth = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[new Date().getMonth()];
  };

  return (
    <div className="dashboard-container p-4">
      <h2 className="mb-4">Production Dashboard</h2>

      {/* Production Status Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-printed">
            <div className="card-value">{productionStats.printed}</div>
            <div className="card-label">Printed Orders</div>
            <Link to="/dashboard/printlog" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-prod">
            <div className="card-value">{productionStats.inProduction}</div>
            <div className="card-label">In Production</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-finished">
            <div className="card-value">{productionStats.finished}</div>
            <div className="card-label">Finished</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-delivered">
            <div className="card-value">{productionStats.delivered}</div>
            <div className="card-label">Delivered</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-billed">
            <div className="card-value">{productionStats.billed}</div>
            <div className="card-label">Billed</div>
            <Link to="/dashboard/payment" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-total">
            <div className="card-value">{productionStats.total}</div>
            <div className="card-label">Total Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>
      </div>

      {/* Production Performance Charts */}
      <div className="row mb-4">
        <div className="col-12">
          <h4 className="mb-3">{getCurrentMonth()} Production Performance</h4>
        </div>

        {/* Production Volume Chart */}
        <div className="col-md-6">
          <div className="dashboard-section p-4" style={{ minHeight: "250px" }}>
            <h5 className="text-center mb-3">Production Volume</h5>
            <SalesGauge
              value={monthlyProduction.totalProduction}
              maxValue={1000}
              targetValue={800}
              title="Target: 1000 Orders"
              size={250}
              segments={10}
            />
          </div>
        </div>

        {/* Billing Performance Chart */}
        <div className="col-md-6">
          <div className="dashboard-section p-4" style={{ minHeight: "250px" }}>
            <h5 className="text-center mb-3">Billing Performance</h5>
            <SalesGauge
              value={monthlyProduction.totalBilled}
              maxValue={2500000}
              targetValue={2000000}
              title="Target: ₱2.5M"
              size={250}
              segments={10}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-section p-3">
            <h4 className="section-title">Quick Actions</h4>
            <div className="d-flex flex-wrap gap-2">
              {userPermissions.isProduction && (
                <>
                  <Link to="/dashboard/printlog" className="btn btn-primary">
                    Print Log
                  </Link>
                  <Link to="/dashboard/prod" className="btn btn-success">
                    Production
                  </Link>
                  <Link to="/dashboard/wiplog" className="btn btn-info">
                    WIP Log
                  </Link>
                </>
              )}
              {userPermissions.isBilling && (
                <Link to="/dashboard/payment" className="btn btn-warning">
                  Record Payment
                </Link>
              )}
              {userPermissions.isAdmin && (
                <Link
                  to="/dashboard/material/add"
                  className="btn btn-secondary"
                >
                  Add Material
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Recent Productions */}
        <div className="col-12 col-lg-6">
          <div className="dashboard-section h-100 p-3">
            <h4 className="section-title">Recent Productions</h4>
            {recentProductions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProductions.map((production) => (
                      <tr key={production.orderID}>
                        <td>
                          <Link
                            to={`/dashboard/orders/edit/${production.orderID}`}
                          >
                            {production.orderID}
                          </Link>
                        </td>
                        <td>{production.clientName}</td>
                        <td>{production.projectName}</td>
                        <td>
                          <span className={`status-badge ${production.status}`}>
                            {production.status}
                          </span>
                        </td>
                        <td>{formatDate(production.productionDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No recent productions found</p>
            )}
          </div>
        </div>

        {/* Overdue Productions */}
        <div className="col-12 col-lg-6">
          <div className="dashboard-section h-100 p-3">
            <h4 className="section-title text-danger">Overdue Productions</h4>
            {overdueProductions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueProductions.map((production) => (
                      <tr key={production.orderID}>
                        <td>
                          <Link
                            to={`/dashboard/orders/edit/${production.orderID}`}
                          >
                            {production.orderID}
                          </Link>
                        </td>
                        <td>{production.clientName}</td>
                        <td>{production.projectName}</td>
                        <td className="text-danger fw-bold">
                          {formatDate(production.dueDate)}
                        </td>
                        <td>
                          <span className={`status-badge ${production.status}`}>
                            {production.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-success">No overdue productions</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashProd;
