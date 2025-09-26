import React, { useEffect, useRef } from "react";
import "./Modal.css";
import Button from "./Button";

/**
 * Modal Component
 *
 * A flexible modal component supporting:
 * - **Form modals** (`variant="form"`) → Centered pop-up dialogs.
 * - **Tooltip modals** (`variant="tooltip"`) → Floating tooltips positioned near elements.
 *
 * ## Props:
 * @param {string} variant - Modal type:
 *     - `"form"` (default) → A centered pop-up modal.
 *     - `"tooltip"` → A floating tooltip positioned via `position.x` & `position.y`.
 * @param {boolean} show - Controls the modal's visibility.
 * @param {function} [onClose] - Function called when the modal closes (not used in tooltips).
 * @param {string} [title] - Title for form modals (not applicable to tooltips).
 * @param {ReactNode} children - Content inside the modal (can be text, elements, or JSX).
 * @param {ReactNode} [footer] - Footer content (optional, only for "form" modals).
 * @param {object} position - `{ x, y }` coordinates for tooltip placement (used for `"tooltip"` variant).
 * @param {string} className - Additional CSS classes for customization.
 * @param {string} size - Modal size:
 *     - `"sm"` → Small modal (300px)
 *     - `"md"` → Medium modal (500px, default)
 *     - `"lg"` → Large modal (800px)
 *     - `"xl"` → Extra large modal (1140px)
 *     - `"full"` → Full screen modal
 * @param {boolean} closeOnOutsideClick - Controls whether the modal closes when clicking outside the modal.
 * @param {boolean} closeOnEsc - Controls whether the modal closes when the ESC key is pressed.
 *
 * ## Example Usage:
 *
 * // 1️⃣ Tooltip Modal (Example from Your Code)
 * <Modal
 *   variant="tooltip"
 *   show={showAllowanceTooltip && tooltipDetail}
 *   position={tooltipPosition}
 * >
 *   <div className="text-center mb-1">
 *     Print Hrs: {tooltipDetail?.printHrs || 0}
 *   </div>
 *   <div className="text-center">T: {tooltipDetail?.top || 0}</div>
 *   <div className="d-flex justify-content-between">
 *     <span>L: {tooltipDetail?.allowanceLeft || 0}</span>
 *     <span className="ms-3">R: {tooltipDetail?.allowanceRight || 0}</span>
 *   </div>
 *   <div className="text-center">B: {tooltipDetail?.bottom || 0}</div>
 *   <div className="text-center">
 *     Usage: {tooltipDetail?.materialUsage || 0}
 *   </div>
 * </Modal>
 *
 * // 2️⃣ Form Modal (For Dialogs)
 * <Modal
 *   show={showForm}
 *   onClose={() => setShowForm(false)}
 *   title="Edit Profile"
 *   footer={<Button onClick={saveProfile}>Save</Button>}
 *   size="lg"
 * >
 *   <input type="text" placeholder="Enter name" />
 * </Modal>
 */

const Modal = ({
  variant = "form", // "form" | "tooltip"
  show = false,
  onClose,
  title,
  children,
  footer,
  position = { x: 0, y: 0 },
  className = "",
  id,
  size = "md", // "sm" | "md" | "lg" | "xl" | "full"
  closeOnOutsideClick = true,
  closeOnEsc = true,
  hideCloseButton = false,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (show && closeOnEsc) {
      const handleEsc = (event) => {
        if (event.key === "Escape") {
          onClose?.();
        }
      };

      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [show, closeOnEsc, onClose]);

  const handleBackdropClick = (event) => {
    if (closeOnOutsideClick && event.target === modalRef.current) {
      onClose?.();
    }
  };

  if (!show) return null;

  if (variant === "tooltip") {
    return (
      <div
        className={`modal-tooltip ${className}`}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={modalRef}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${id}`}
      onClick={handleBackdropClick}
    >
      <div className={`modal-container modal-${size}`}>
        <div className={`modal-content ${className}`}>
          <div className="modal-header">
            <h5 className="modal-title" id={`modal-title-${id}`}>
              {title}
            </h5>
            {!hideCloseButton && (
              <Button
                variant="cancel"
                iconOnly
                size="sm"
                onClick={onClose}
                aria-label="Close modal"
              />
            )}
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default Modal;
