import React, { useEffect } from "react";
import Button from "./Button";

const ModalAlert = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  type = "confirm", // 'alert' or 'confirm'
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!show) return;

      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Enter") {
        if (type === "confirm") {
          onConfirm();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [show, onClose, onConfirm, type]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {title === "Error" && (
                  <i
                    className="bi bi-exclamation-octagon-fill text-danger"
                    style={{ marginRight: "8px" }}
                  />
                )}
                {title}
              </h5>
              {type === "alert" && (
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                />
              )}
            </div>
            <div className="modal-body">
              <p>{message}</p>
            </div>
            <div className="modal-footer">
              {type === "confirm" && (
                <>
                  <Button variant="save" onClick={onConfirm}>
                    {confirmText}
                  </Button>
                  <Button variant="cancel" onClick={onClose}>
                    {cancelText}
                  </Button>
                </>
              )}
              {type === "alert" && (
                <Button variant="save" onClick={onClose}>
                  {confirmText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ display: "block" }} />
    </>
  );
};

export default ModalAlert;
