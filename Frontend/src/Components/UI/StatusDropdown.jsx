import React, { useRef, useEffect } from "react";
import "./StatusDropdown.css";

const StatusDropdown = ({ show, onClose, position, items }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Handle ESC key
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      // Handle clicking outside
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          onClose();
        }
      };

      document.addEventListener("keydown", handleEsc);
      document.addEventListener("mousedown", handleClickOutside);

      // Cleanup
      return () => {
        document.removeEventListener("keydown", handleEsc);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [show, onClose]);

  useEffect(() => {
    if (show && dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const rect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Check if dropdown would go below viewport
      if (position.y + rect.height > viewportHeight) {
        dropdown.style.top = `${position.y - rect.height}px`;
      } else {
        dropdown.style.top = `${position.y}px`;
      }

      // Check if dropdown would go beyond right edge
      if (position.x + rect.width > viewportWidth) {
        dropdown.style.left = `${position.x - rect.width}px`;
      } else {
        dropdown.style.left = `${position.x}px`;
      }
    }
  }, [show, position]);

  if (!show) return null;

  return (
    <>
      <div className="status-dropdown-backdrop" onClick={onClose} />
      <div
        ref={dropdownRef}
        className="status-dropdown"
        style={{
          position: "absolute",
          transform: "translateX(-58px)",
          zIndex: 1050,
          backgroundColor: "white",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          minWidth: "100px",
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="status-dropdown-item"
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
};

export default StatusDropdown;
