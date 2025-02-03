import React from "react";
import "./CheckboxHeader.css"; // Ensure you have the CSS file

const CheckboxHeader = ({
  checked = false,
  readOnly = true,
  className = "",
  ...props
}) => {
  return (
    <input
      type="checkbox"
      className={`custom-checkbox ${className}`}
      checked={checked}
      readOnly={readOnly}
      {...props} // Allows additional props (onClick, styles, etc.)
    />
  );
};

export default CheckboxHeader;
