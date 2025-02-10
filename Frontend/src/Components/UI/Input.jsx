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
  label,
  error,
  required,
  ...props
}) => {
  const getInputClass = () => {
    const baseClass = "form-control";
    const variantClass = variant === "table" ? "input-table" : "input-form";
    const roundedClass = variant === "form" ? "rounded-0" : "";
    return `${baseClass} ${variantClass} ${roundedClass} ${
      error ? "is-invalid" : ""
    } ${className}`.trim();
  };

  return (
    <div className="input-wrapper">
      {label && (
        <label
          htmlFor={id}
          className={variant === "table" ? "visually-hidden" : ""}
        >
          {label}
        </label>
      )}
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
        aria-label={label || placeholder}
        aria-invalid={error ? "true" : "false"}
        aria-required={required ? "true" : "false"}
        {...props}
      />
      {error && (
        <div className="invalid-feedback" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
};

export default Input;
