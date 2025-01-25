import React from "react";
import "./Modal.css";
import Button from "./Button";

const Modal = ({
  variant = "form", // "form" | "tooltip"
  show = false,
  onClose,
  title,
  children,
  footer,
  position = { x: 0, y: 0 },
  className = "",
}) => {
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
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className={`modal-content ${className}`}>
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <Button variant="cancel" iconOnly size="sm" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default Modal;
