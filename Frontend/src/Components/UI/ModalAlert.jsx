import React, { useEffect } from "react";
import Button from "./Button";

const ModalAlert = ({
  show,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  type = "confirm", // 'alert', 'confirm', or 'custom'
  customContent = null, // New prop for custom content
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!show) return;

      if (event.key === "Escape") {
        if (type === "confirm" && onCancel) {
          onCancel();
        } else {
          onClose();
        }
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
  }, [show, onClose, onConfirm, onCancel, type]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="alert-title">
                {title === "Error" && (
                  <i
                    className="bi bi-exclamation-octagon-fill text-danger"
                    style={{ marginRight: "8px" }}
                    aria-hidden="true"
                  />
                )}
                {title}
              </h5>
              {/* ✂️ Removed the 'X' close button here */}
            </div>
            <div className="modal-body">
              {customContent ? (
                <div>
                  {message && (
                    <p style={{ whiteSpace: "pre-line" }}>{message}</p>
                  )}
                  {customContent}
                </div>
              ) : (
                <p id="alert-message" style={{ whiteSpace: "pre-line" }}>
                  {message}
                </p>
              )}
            </div>
            <div className="modal-footer">
              {type === "confirm" && (
                <>
                  <Button
                    variant="save"
                    onClick={onConfirm}
                    aria-label={confirmText}
                  >
                    {confirmText}
                  </Button>
                  <Button
                    variant="cancel"
                    onClick={() => {
                      if (onCancel) {
                        onCancel();
                      } else {
                        onClose();
                      }
                    }}
                    aria-label={cancelText}
                  >
                    {cancelText}
                  </Button>
                </>
              )}
              {type === "alert" && (
                <Button
                  variant="save"
                  onClick={onClose}
                  aria-label={confirmText}
                >
                  {confirmText}
                </Button>
              )}
              {type === "custom" &&
                customContent &&
                // For custom type, the footer is handled by the customContent
                null}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ display: "block" }} />
    </>
  );
};

export default ModalAlert;
