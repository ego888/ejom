import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const Home = () => {
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

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard-container p-4">
      <h2 className="mb-4">Dashboard</h2>

      {/* Order Status Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-open">
            <div className="card-value">{orderStats.open}</div>
            <div className="card-label">Open Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-printed">
            <div className="card-value">{orderStats.printed}</div>
            <div className="card-label">Printed Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-prod">
            <div className="card-value">{orderStats.prod}</div>
            <div className="card-label">In Production</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-finished">
            <div className="card-value">{orderStats.finished}</div>
            <div className="card-label">Finished</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-delivered">
            <div className="card-value">{orderStats.delivered}</div>
            <div className="card-label">Delivered</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card dashboard-total">
            <div className="card-value">{orderStats.total}</div>
            <div className="card-label">Total Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
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
                      <tr key={order.orderId}>
                        <td>
                          <Link to={`/dashboard/orders/edit/${order.orderId}`}>
                            {order.orderId}
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
                      <tr key={order.orderId}>
                        <td>
                          <Link to={`/dashboard/orders/edit/${order.orderId}`}>
                            {order.orderId}
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

export default Home;
