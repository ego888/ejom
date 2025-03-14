const Dropdown = ({
  variant = "form", // "form" or "table"
  size = "normal", // New prop: "normal" or "small"
  value,
  onChange,
  options,
  placeholder = "",
  id,
  name,
  required,
  disabled,
  error,
  labelKey = "name",
  valueKey = "id",
  className = "",
  label,
  ...props
}) => {
  const getDropdownClass = () => {
    const baseClass = variant === "form" ? "form-input" : "form-input detail";

    const sizeClass = size === "small" ? "dropdown-sm" : "";

    return `custom-dropdown ${error ? "is-invalid" : ""} ${className}`.trim();
  };

  return (
    <div className="dropdown-wrapper">
      {label && (
        <label
          htmlFor={id}
          className={variant === "table" ? "visually-hidden" : ""}
        >
          {label}
        </label>
      )}
      <select
        id={id}
        name={name}
        className={getDropdownClass()}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-label={label || placeholder}
        aria-invalid={error ? "true" : "false"}
        aria-required={required ? "true" : "false"}
        {...props}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option[valueKey]}
            value={option[valueKey]}
            aria-label={option[labelKey]}
          >
            {option[labelKey]}
          </option>
        ))}
      </select>
      {error && (
        <div className="invalid-feedback" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
