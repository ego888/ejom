import React from "react";

const Dropdown = ({
  variant = "form", // "form" or "table"
  value,
  onChange,
  options,
  placeholder = "",
  id,
  name,
  required,
  disabled,
  error,
  labelKey = "name", // key to use for option label
  valueKey = "id", // key to use for option value
  className = "",
}) => {
  const getDropdownClass = () => {
    const baseClass =
      variant === "form"
        ? "form-select rounded-0"
        : "form-control form-control-sm";

    return `${baseClass} ${error ? "is-invalid" : ""} ${className}`.trim();
  };

  return (
    <select
      id={id}
      name={name}
      className={getDropdownClass()}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option[valueKey]} value={option[valueKey]}>
          {option[labelKey]}
        </option>
      ))}
    </select>
  );
};

export default Dropdown;
