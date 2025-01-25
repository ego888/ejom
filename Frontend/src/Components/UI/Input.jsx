import React from "react";
import "./Input.css";

const Input = ({
  variant = "form", // "form" | "table"
  type = "text",
  id,
  name,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  readOnly = false,
  className = "",
  min,
  max,
  step,
}) => {
  const getInputClass = () => {
    const baseClass = "form-control";
    const variantClass = variant === "table" ? "input-table" : "input-form";
    const roundedClass = variant === "form" ? "rounded-0" : "";
    return `${baseClass} ${variantClass} ${roundedClass} ${className}`.trim();
  };

  return (
    <input
      type={type}
      id={id}
      name={name}
      className={getInputClass()}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      min={min}
      max={max}
      step={step}
    />
  );
};

export default Input;
