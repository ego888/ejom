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
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
    customContent: null,
  });

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

  const onScanSuccess = async (decodedText) => {
    if (isProcessing) {
      return;
    }

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

      setScannedData(orderId);
      setIsProcessing(true);

      // Stop scanning while we update the order
      if (scannerRef.current) {
        await scannerRef.current.clear();
        setIsScanning(false);
      }

      await markOrderAsDelivered(orderId);
    } catch (error) {
      console.error("Error processing QR code:", error);
      setAlert({
        show: true,
        title: "Invalid QR Code",
        message:
          "The scanned QR code is not a valid Job Order code. Please try again.",
        type: "alert",
        onConfirm: null,
        customContent: null,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onScanFailure = (error) => {
    // This gets called frequently during scanning, so we don't log every failure
    console.debug("QR scan failed:", error);
  };

  const markOrderAsDelivered = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${ServerIP}/auth/update_order_status`,
        {
          orderId,
          newStatus: "Delivered",
          deliveryScan: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          title: "Delivery Recorded",
          message:
            response.data.Message ||
            `Order #${orderId} has been marked as delivered.`,
          type: "confirm",
          onConfirm: () => {
            setAlert((prev) => ({
              ...prev,
              show: false,
              onConfirm: null,
              customContent: null,
            }));
            restartScanning();
          },
          customContent: null,
        });
      } else {
        throw new Error(response.data.Error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      if (error.response?.status === 401) {
        handleApiError(error, navigate, setAlert);
      } else {
        setAlert({
          show: true,
          title: "Update Failed",
          message:
            error.response?.data?.Error ||
            "Failed to mark the order as delivered. Please try again.",
          type: "alert",
          onConfirm: () => {
            setAlert((prev) => ({
              ...prev,
              show: false,
              onConfirm: null,
              customContent: null,
            }));
            restartScanning();
          },
          customContent: null,
        });
      }
    }
  };

  const restartScanning = () => {
    setScannedData(null);
    setAlert((prev) => ({
      ...prev,
      show: false,
      onConfirm: null,
      customContent: null,
    }));

    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }

    setIsScanning(false);

    // Restart scanner
    setTimeout(() => {
      initializeScanner();
    }, 150);
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
                  <li>
                    The order is automatically marked as Delivered once the scan
                    succeeds
                  </li>
                  <li>Tap Start Scanning to process the next order</li>
                </ol>

                <div className="alert alert-info small mt-3 mb-0">
                  Only valid Job Order QR codes containing the JO number will be
                  accepted.
                </div>
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
