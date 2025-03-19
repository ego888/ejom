import React, { useEffect, useRef } from "react";
import "./CheckboxHeader.css"; // Ensure you have the CSS file

const CheckboxHeader = ({
  checked = false,
  indeterminate = false,
  onChange = () => {},
  className = "",
  id,
  label,
  ...props
}) => {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="checkbox-header-wrapper">
      <input
        ref={checkboxRef}
        type="checkbox"
        id={id}
        className={`custom-checkbox ${className}`}
        checked={checked}
        onChange={onChange}
        aria-label={label || "Select all items"}
        role="checkbox"
        aria-checked={checked}
        {...props} // Allows additional props (onClick, styles, etc.)
      />
      {label && (
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
      )}
    </div>
  );
};

export default CheckboxHeader;
