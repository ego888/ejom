import React, { useEffect } from "react";
import Button from "./Button";
import "./ModalCustom.css";

const ModalCustom = ({
  show,
  onClose,
  title,
  children,
  width = "90%",
  height = "80%",
}) => {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div
        className="custom-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width, height }}
      >
        <div className="custom-modal-header">
          <h5 className="custom-modal-title">{title}</h5>
          <Button variant="cancel" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="custom-modal-body">{children}</div>
      </div>
    </div>
  );
};

export default ModalCustom;
