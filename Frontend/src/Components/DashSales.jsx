import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { formatPeso } from "../utils/orderUtils";
import SalesGauge from "./UI/SalesGauge";
import "./Dashboard.css";

const DashSales = () => {
  const [orderStats, setOrderStats] = useState({
    total: 0,
    open: 0,
    printed: 0,
    prod: 0,
    finished: 0,
    delivered: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [monthlySales, setMonthlySales] = useState({
    userMonthlySales: 0,
    totalMonthlySales: 0,
  });
  const [userPermissions, setUserPermissions] = useState({
    isAdmin: false,
    isSales: false,
    isAccounting: false,
    isArtist: false,
    isOperator: false,
  });

  useEffect(() => {
    // Set user permissions from token
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setUserPermissions({
        isAdmin: decoded.categoryId === 1,
        isSales: decoded.sales === 1,
        isAccounting: decoded.accounting === 1,
        isArtist: decoded.artist === 1,
        isOperator: decoded.operator === 1,
      });
    }

    // Fetch dashboard data
    fetchOrderStats();
    fetchRecentOrders();
    fetchOverdueOrders();
    fetchMonthlySales();
  }, []);

  const fetchOrderStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/order_stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setOrderStats(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching order stats:", error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/recent_orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setRecentOrders(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching recent orders:", error);
    }
  };

  const fetchOverdueOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/overdue_orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setOverdueOrders(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching overdue orders:", error);
    }
  };

  const fetchMonthlySales = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/monthly_sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setMonthlySales(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching monthly sales:", error);
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Function to get the percentage for the speedometer
  const calculatePercentage = (value, maxValue) => {
    return Math.min(Math.max((value / maxValue) * 100, 0), 100);
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
      <h2 className="mb-4">Dashboard</h2>

      {/* Order Status Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Open">
            <div className="card-value">{orderStats.open}</div>
            <div className="card-label">Open Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Printed">
            <div className="card-value">{orderStats.printed}</div>
            <div className="card-label">Printed Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Prod">
            <div className="card-value">{orderStats.prod}</div>
            <div className="card-label">In Production</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Finished">
            <div className="card-value">{orderStats.finished}</div>
            <div className="card-label">Finished</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Delivered">
            <div className="card-value">{orderStats.delivered}</div>
            <div className="card-label">Delivered</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge default">
            <div className="card-value">{orderStats.billed}</div>
            <div className="card-label">Total Billed</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>
      </div>

      {/* Speedometer Charts for Monthly Sales */}
      <div className="row mb-4">
        <div className="col-12">
          <h4 className="mb-3">{getCurrentMonth()} Sales Performance</h4>
        </div>

        {/* User Monthly Sales Chart */}
        <div className="col-md-6">
          <div className="dashboard-section p-4" style={{ minHeight: "250px" }}>
            <h5 className="text-center mb-3">Your Monthly Sales</h5>
            <SalesGauge
              value={monthlySales.userMonthlySales}
              maxValue={800000}
              targetValue={465000}
              title="Target: ₱800K"
              size={250}
              segments={8}
            />
          </div>
        </div>

        {/* Total Monthly Sales Chart */}
        <div className="col-md-6">
          <div className="dashboard-section p-4" style={{ minHeight: "250px" }}>
            <h5 className="text-center mb-3">Total Monthly Sales</h5>
            <SalesGauge
              value={monthlySales.totalMonthlySales}
              maxValue={2500000}
              targetValue={2200000}
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
              {userPermissions.isSales && (
                <>
                  <Link to="/dashboard/quotes/add" className="btn btn-primary">
                    New Quote
                  </Link>
                  <Link to="/dashboard/orders/add" className="btn btn-success">
                    New Order
                  </Link>
                  <Link to="/dashboard/client/add" className="btn btn-info">
                    New Client
                  </Link>
                </>
              )}
              {userPermissions.isAccounting && (
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
        {/* Recent Orders */}
        <div className="col-12 col-lg-6">
          <div className="dashboard-section h-100 p-3">
            <h4 className="section-title">Recent Orders</h4>
            {recentOrders.length > 0 ? (
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
                    {recentOrders.map((order) => (
                      <tr key={order.orderID}>
                        <td>
                          <Link to={`/dashboard/orders/edit/${order.orderID}`}>
                            {order.orderID}
                          </Link>
                        </td>
                        <td>{order.clientName}</td>
                        <td>{order.projectName}</td>
                        <td>
                          <span className={`status-badge ${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{formatDate(order.orderDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No recent orders found</p>
            )}
          </div>
        </div>

        {/* Overdue Orders */}
        <div className="col-12 col-lg-6">
          <div className="dashboard-section h-100 p-3">
            <h4 className="section-title text-danger">Overdue Orders</h4>
            {overdueOrders.length > 0 ? (
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
                    {overdueOrders.map((order) => (
                      <tr key={order.orderID}>
                        <td>
                          <Link to={`/dashboard/orders/edit/${order.orderID}`}>
                            {order.orderID}
                          </Link>
                        </td>
                        <td>{order.clientName}</td>
                        <td>{order.projectName}</td>
                        <td className="text-danger fw-bold">
                          {formatDate(order.dueDate)}
                        </td>
                        <td>
                          <span className={`status-badge ${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-success">No overdue orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashSales;
