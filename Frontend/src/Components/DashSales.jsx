import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { formatNumber } from "../utils/orderUtils";
import SalesGauge from "./UI/SalesGauge";
import SalesLineChart from "./UI/SalesLineChart";
import YearMonthSelector from "./UI/YearMonthSelector";
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
  const [salesLineData, setSalesLineData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
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
    fetchSalesLineData();
  }, []);

  // Refetch data when year/month changes
  useEffect(() => {
    fetchSalesLineData();
    fetchSelectedMonthTotalSales();
  }, [selectedYear, selectedMonth]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

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
        setMonthlySales({
          userMonthlySales: Number(response.data.Result.userMonthlySales) || 0,
          totalMonthlySales:
            Number(response.data.Result.totalMonthlySales) || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching monthly sales:", error);
      setMonthlySales({
        userMonthlySales: 0,
        totalMonthlySales: 0,
      });
    }
  };

  const fetchSelectedMonthTotalSales = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/sales_daily_cumulative`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            year: selectedYear,
            month: selectedMonth,
          },
        }
      );

      if (response.data.Status) {
        // Calculate total sales from the line chart data
        const totalSales = response.data.Result.dailySalesData.reduce(
          (total, employee) => {
            const lastDay = employee.data[employee.data.length - 1];
            const employeeTotal = lastDay
              ? parseFloat(lastDay.cumulativeSales) || 0
              : 0;
            return total + employeeTotal;
          },
          0
        );

        setMonthlySales((prev) => ({
          ...prev,
          totalMonthlySales: totalSales,
        }));
      }
    } catch (error) {
      console.error("Error fetching selected month total sales:", error);
    }
  };

  const fetchSalesLineData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/sales_daily_cumulative`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            year: selectedYear,
            month: selectedMonth,
          },
        }
      );

      if (response.data.Status) {
        setSalesLineData(response.data.Result.dailySalesData || []);
      }
    } catch (error) {
      console.error("Error fetching sales line data:", error);
      setSalesLineData([]);
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

  // Get selected month name
  const getSelectedMonthName = () => {
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
    return months[selectedMonth - 1];
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

      {/* Sales Performance Charts */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Sales Performance</h4>
            <YearMonthSelector
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
            />
          </div>
        </div>

        {/* Sales Performance Line Chart */}
        <div className="col-md-6">
          <div className="dashboard-section p-4" style={{ minHeight: "400px" }}>
            <h5 className="text-center mb-3">Sales Team Performance</h5>
            <SalesLineChart
              data={salesLineData}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              size={550}
            />
          </div>
        </div>

        {/* Total Monthly Sales Chart */}
        <div className="col-md-6">
          <div className="dashboard-section p-4" style={{ minHeight: "400px" }}>
            <h5 className="text-center mb-3">
              Total Monthly Sales - {getSelectedMonthName()} {selectedYear}
            </h5>
            <SalesGauge
              value={(() => {
                console.log(
                  "Total monthly sales value:",
                  monthlySales.totalMonthlySales
                );
                console.log("monthlySales raw:", monthlySales);
                console.log(
                  "typeof totalMonthlySales:",
                  typeof monthlySales?.totalMonthlySales
                );
                console.log(
                  "sanitized value:",
                  monthlySales?.totalMonthlySales
                );

                console.log("Is NaN?", isNaN(monthlySales.totalMonthlySales));
                return isNaN(monthlySales.totalMonthlySales)
                  ? 0
                  : monthlySales.totalMonthlySales;
              })()}
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
