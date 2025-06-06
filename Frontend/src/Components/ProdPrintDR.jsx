import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig"; // Import configured axios
import { ServerIP } from "../config";
import PrintDR from "./PrintDR";
import ModalAlert from "./UI/ModalAlert";

function ProdPrintDR() {
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Get orders without DR numbers
        const ordersResponse = await axios.get(
          `${ServerIP}/auth/orders-all-DR`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("GET ordersResponse", ordersResponse);
        if (!ordersResponse.data.Status) {
          throw new Error(
            ordersResponse.data.Error || "Failed to fetch orders"
          );
        }

        const orders = ordersResponse.data.Result;
        if (!orders || orders.length === 0) {
          throw new Error("No orders available for DR printing");
        }

        // Get the last DR number
        const lastDrResponse = await axios.get(
          `${ServerIP}/auth/jomcontrol/lastDR`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!lastDrResponse.data.Status) {
          throw new Error(
            lastDrResponse.data.Error || "Failed to fetch last DR number"
          );
        }

        let currentDrNumber = parseInt(lastDrResponse.data.Result.lastDrNumber);
        // Check if drDate is empty and assign today's date if it is

        console.log("orders", orders);
        // Prepare orders with DR numbers
        const preparedOrders = orders.map((order) => {
          // Check if drDate is empty for each individual order
          const drDate = order.drDate || new Date().toISOString().split("T")[0];

          return {
            orderId: order.id,
            clientName: order.clientName,
            customerName: order.customerName,
            projectName: order.projectName,
            orderedBy: order.orderedBy,
            drDate: drDate,
            drNum: ++currentDrNumber,
            order_details: order.order_details || [
              {
                quantity: order.quantity || 0,
                width: order.width || "",
                height: order.height || "",
                unit: order.unit || "",
                material: order.material || "",
                itemDescription: order.description || "",
                unitPrice: order.unitPrice || "",
                discount: order.discount || "",
                amount: order.amount || "",
              },
            ],
            deliveryInst: order.deliveryInst || "",
            totalAmount: order.totalAmount || "",
            amountDisc: order.amountDisc || "",
            grandTotal: order.grandTotal || "",
          };
        });

        console.log("preparedOrders", preparedOrders);
        setOrderData({
          orderData: preparedOrders,
        });
      } catch (error) {
        console.error("Error preparing DR print:", error);
        setAlert({
          show: true,
          title: "Error",
          message: error.message || "Failed to prepare orders for printing",
          type: "alert",
        });
        // Navigate back to production dashboard if there's an error
        if (error.message === "No orders available for DR printing") {
          setTimeout(() => navigate("/dashboard/prod"), 2000);
        }
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <>
      {orderData && <PrintDR data={orderData.orderData} showAmounts={true} />}
      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => {
          setAlert((prev) => ({ ...prev, show: false }));
          if (alert.title === "Success") {
            navigate(-1);
          }
        }}
      />
    </>
  );
}

export default ProdPrintDR;
