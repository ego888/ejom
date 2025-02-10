import React, { useEffect } from "react";
import Button from "./Button";

/**
 * ModalAlert Component
 *
 * A reusable modal component that displays either an alert or a confirm dialog.
 * It can be used to show messages, warnings, or confirmation prompts.
 *
 * ## Props:
 * @param {boolean} show - Controls the visibility of the modal.
 * @param {function} onClose - Function called when the modal is closed (e.g., clicking the cancel button or pressing "Escape").
 * @param {function} onConfirm - Function called when the confirm button is clicked (only applicable for confirm dialogs).
 * @param {string} title - The title of the modal (e.g., "Error", "Warning", "Confirmation").
 * @param {string} message - The main message/content of the modal.
 * @param {string} confirmText - Text for the confirm button (default: "OK").
 * @param {string} cancelText - Text for the cancel button (default: "Cancel").
 * @param {string} type - Defines the modal type. Can be:
 *     - "alert"  → Displays a single "OK" button.
 *     - "confirm" → Displays both "OK" and "Cancel" buttons.
 *
 * ## Example Usage:
 *
 * // Alert Modal
 * <ModalAlert
 *   show={showAlert}
 *   onClose={() => setShowAlert(false)}
 *   title="Error"
 *   message="Something went wrong!"
 *   type="alert"
 * />
 *
 * // Confirm Modal
 * <ModalAlert
 *   show={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleConfirm}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 *   confirmText="Yes, Delete"
 *   cancelText="Cancel"
 *   type="confirm"
 * />
 */

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
              {type === "alert" && (
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close alert"
                />
              )}
            </div>
            <div className="modal-body">
              <p id="alert-message">{message}</p>
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
                    onClick={onClose}
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
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ display: "block" }} />
    </>
  );
};

export default ModalAlert;
