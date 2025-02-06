import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ServerIP } from "../config";
import PrintDR from "./PrintDR";
import ModalAlert from "./UI/ModalAlert";

function ProdPrintOneDR() {
  const navigate = useNavigate();
  const location = useLocation();
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
        if (!location.state || !location.state.orderInfo) {
          throw new Error("No order information provided");
        }

        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
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
          throw new Error("Failed to fetch last DR number");
        }

        const newDrNumber =
          parseInt(lastDrResponse.data.Result.lastDrNumber) + 1;
        const orderInfo = location.state.orderInfo;

        // Prepare order with new DR number
        const preparedOrder = {
          orderId: orderInfo.orderId,
          clientName: orderInfo.clientName,
          projectName: orderInfo.projectName,
          drNum: newDrNumber,
          order_details: orderInfo.order_details,
          deliveryInst: orderInfo.deliveryInst,
        };

        setOrderData({
          orderData: [preparedOrder],
          drUpdateData: [
            {
              orderID: orderInfo.orderId,
              drnum: newDrNumber,
            },
          ],
        });
      } catch (error) {
        setAlert({
          show: true,
          title: "Error",
          message: error.message || "Failed to prepare order for printing",
          type: "alert",
        });
      }
    };

    fetchData();
  }, [location.state]);

  const handleAfterPrint = async () => {
    try {
      if (!orderData) return;

      const token = localStorage.getItem("token");
      // Update DR number in the database
      await axios.put(
        `${ServerIP}/auth/update_orders_drnum`,
        { orders: orderData.drUpdateData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      navigate(-1);
    } catch (error) {
      setAlert({
        show: true,
        title: "Error",
        message: error.message || "Failed to update DR number",
        type: "alert",
      });
    }
  };

  return (
    <>
      {orderData && (
        <PrintDR data={orderData.orderData} onAfterPrint={handleAfterPrint} />
      )}
      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}

export default ProdPrintOneDR;
