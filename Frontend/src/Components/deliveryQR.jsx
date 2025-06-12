import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import Button from "./UI/Button";
import ModalAlert from "./UI/ModalAlert";
import { ServerIP } from "../config";
import axios from "../utils/axiosConfig";
import { handleApiError } from "../utils/orderUtils";
import "./deliveryQR.css";

function DeliveryQR() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const statusOptions = [
    "Printed",
    "Prod",
    "Finished",
    "Delivered",
    "Billed",
    "Closed",
  ];

  useEffect(() => {
    // Initialize scanner when component mounts
    if (!isScanning) {
      initializeScanner();
    }

    // Cleanup scanner when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const initializeScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;
    setIsScanning(true);
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log("QR Code scanned:", decodedText);

    try {
      // Parse the QR code data (assuming it contains order ID)
      // QR code might be in format: "ORDER:12345" or just "12345"
      let orderId;
      if (decodedText.startsWith("ORDER:")) {
        orderId = decodedText.replace("ORDER:", "");
      } else if (!isNaN(decodedText)) {
        orderId = decodedText;
      } else {
        throw new Error("Invalid QR code format");
      }

      setScannedData(decodedText);

      // Fetch order information
      await fetchOrderInfo(orderId);

      // Stop scanning after successful scan
      if (scannerRef.current) {
        await scannerRef.current.clear();
        setIsScanning(false);
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setAlert({
        show: true,
        title: "Invalid QR Code",
        message:
          "The scanned QR code is not a valid Job Order code. Please try again.",
        type: "alert",
      });
    }
  };

  const onScanFailure = (error) => {
    // This gets called frequently during scanning, so we don't log every failure
    console.debug("QR scan failed:", error);
  };

  const fetchOrderInfo = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status && response.data.Result?.length > 0) {
        const order = response.data.Result[0];
        setOrderInfo(order);

        setAlert({
          show: true,
          title: "Order Found",
          message: `Order #${order.orderId} found!\n\nClient: ${
            order.customerName || order.clientName
          }\nProject: ${order.projectName}\nCurrent Status: ${
            order.status
          }\n\nSelect new status:`,
          type: "custom",
          customContent: renderStatusSelection(order),
        });
      } else {
        throw new Error("Order not found");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      setAlert({
        show: true,
        title: "Order Not Found",
        message: `Order ID ${orderId} was not found in the system. Please verify the QR code and try again.`,
        type: "alert",
      });
      restartScanning();
    }
  };

  const renderStatusSelection = (order) => {
    return (
      <div className="mt-3">
        <div className="mb-3">
          <strong>Select new status for Order #{order.orderId}:</strong>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <Button
              key={status}
              variant={status === order.status ? "view" : "save"}
              size="sm"
              onClick={() => handleStatusUpdate(order.orderId, status)}
              disabled={status === order.status}
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="mt-3 d-flex gap-2 justify-content-end">
          <Button variant="cancel" onClick={restartScanning}>
            Cancel / Scan Another
          </Button>
        </div>
      </div>
    );
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update_order_status`,
        {
          orderId: orderId,
          newStatus: newStatus,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          title: "Success",
          message: `Order #${orderId} status has been updated to "${newStatus}" successfully!`,
          type: "confirm",
          onConfirm: () => {
            setAlert({ ...alert, show: false });
            restartScanning();
          },
        });
      } else {
        throw new Error(response.data.Error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      setAlert({
        show: true,
        title: "Update Failed",
        message: "Failed to update order status. Please try again.",
        type: "alert",
      });
    }
  };

  const restartScanning = () => {
    setScannedData(null);
    setOrderInfo(null);
    setAlert({ ...alert, show: false });

    // Restart scanner
    setTimeout(() => {
      initializeScanner();
    }, 100);
  };

  const handleBack = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    navigate("/dashboard");
  };

  return (
    <div className="delivery-qr-page">
      <div className="px-4 mt-3">
        <div className="p-3 rounded border">
          <div className="mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between">
            <h3 className="m-0">Delivery QR Scanner</h3>
            <div className="d-flex gap-2">
              {!isScanning && (
                <Button variant="save" onClick={restartScanning}>
                  Start Scanning
                </Button>
              )}
              <Button variant="cancel" onClick={handleBack}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8">
              <div className="scanner-container">
                <h5 className="mb-3">
                  {isScanning ? "Scan Job Order QR Code" : "Scanner Stopped"}
                </h5>
                <div
                  id="qr-reader"
                  style={{ width: "100%", maxWidth: "500px" }}
                ></div>

                {scannedData && (
                  <div className="mt-3 alert alert-success">
                    <strong>Scanned Data:</strong> {scannedData}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-4">
              <div className="info-panel p-3 bg-light rounded">
                <h6>Instructions:</h6>
                <ol className="small">
                  <li>Point your camera at the QR code on the Job Order</li>
                  <li>Wait for the QR code to be recognized</li>
                  <li>Select the new status for the order</li>
                  <li>Confirm the status update</li>
                </ol>

                <h6 className="mt-3">Available Status Options:</h6>
                <ul className="small">
                  {statusOptions.map((status) => (
                    <li key={status}>{status}</li>
                  ))}
                </ul>

                {orderInfo && (
                  <div className="mt-3">
                    <h6>Current Order:</h6>
                    <div className="small">
                      <strong>Order #:</strong> {orderInfo.orderId}
                      <br />
                      <strong>Client:</strong>{" "}
                      {orderInfo.customerName || orderInfo.clientName}
                      <br />
                      <strong>Project:</strong> {orderInfo.projectName}
                      <br />
                      <strong>Status:</strong>{" "}
                      <span className={`status-badge ${orderInfo.status}`}>
                        {orderInfo.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        customContent={alert.customContent}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
        onConfirm={() => {
          if (alert.onConfirm) {
            alert.onConfirm();
          } else {
            setAlert((prev) => ({ ...prev, show: false }));
          }
        }}
      />
    </div>
  );
}

export default DeliveryQR;
