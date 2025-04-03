import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../utils/axiosConfig";
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

        const orderInfo = location.state.orderInfo;
        let drNumber = orderInfo.drNum;
        console.log("DRNUMBER", drNumber);
        console.log("orderInfo", orderInfo);
        // Only get new DR number if one wasn't passed
        if (!orderInfo.drNum) {
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

          drNumber = parseInt(lastDrResponse.data.Result.lastDrNumber) + 1;
        } else {
          drNumber = orderInfo.drNum;
        }

        // Check if drDate is empty and assign today's date if it is
        if (!orderInfo.drDate) {
          orderInfo.drDate = new Date().toISOString().split("T")[0];
        }

        console.log("orderInfo DR Date", orderInfo);

        // Prepare order with DR number
        const preparedOrder = {
          orderId: orderInfo.orderId,
          clientName: orderInfo.clientName,
          customerName: orderInfo.customerName,
          projectName: orderInfo.projectName,
          drDate: orderInfo.drDate,
          drNum: drNumber,
          deliveryInst: orderInfo.deliveryInst,
          order_details: orderInfo.order_details,
          totalAmount: orderInfo.totalAmount,
          amountDisc: orderInfo.amountDisc,
          grandTotal: orderInfo.grandTotal,
        };

        console.log("preparedOrder", preparedOrder);

        setOrderData({
          orderData: [preparedOrder],
          drUpdateData: [
            {
              orderID: orderInfo.orderId,
              drnum: drNumber,
              drDate: orderInfo.drDate,
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
      {orderData &&
        (console.log("orderData", orderData),
        (
          <PrintDR data={orderData.orderData} onAfterPrint={handleAfterPrint} />
        ))}
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
