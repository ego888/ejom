import React, { useState, useRef, useEffect } from "react";
import "./Dropdown2.css";

const Dropdown2 = ({
  variant = "form",
  value,
  onChange,
  options = [],
  placeholder = "",
  id,
  name,
  required,
  disabled,
  error,
  className = "",
  label,
  column1Key = "name", // key for first column
  column2Key = "name2", // key for second column
  valueKey = "id",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => opt[valueKey] === value);

  // Filter options based on search term
  const filteredOptions = options.filter(
    (option) =>
      option[column1Key].toLowerCase().includes(searchTerm.toLowerCase()) ||
      option[column2Key].toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (selectedOption) {
      setSelectedLabel(selectedOption[column1Key]);
    } else {
      setSelectedLabel(placeholder);
    }
  }, [value, options, column1Key, placeholder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(""); // Clear search when closing
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange({
      target: {
        value: option[valueKey],
        option: option, // Include the full option object
      },
    });
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSearchClick = (e) => {
    e.stopPropagation(); // Prevent dropdown from closing
  };

  return (
    <div className="dropdown-wrapper" ref={dropdownRef}>
      {label && (
        <label
          htmlFor={id}
          className={variant === "table" ? "visually-hidden" : ""}
        >
          {label}
        </label>
      )}
      <div className={`custom-dropdown ${error ? "is-invalid" : ""}`}>
        <div
          className="form-input"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedLabel}
        </div>
        {isOpen && !disabled && (
          <div className="dropdown-options">
            <div className="dropdown-search" onClick={handleSearchClick}>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                autoFocus
              />
            </div>
            {required && (
              <div
                className="dropdown-option placeholder"
                onClick={() => handleSelect({ [valueKey]: "" })}
              >
                {placeholder}
              </div>
            )}
            {filteredOptions.map((option) => (
              <div
                key={option[valueKey]}
                className={`dropdown-option ${
                  option[valueKey] === value ? "selected" : ""
                }`}
                onClick={() => handleSelect(option)}
              >
                <span className="option-col1">{option[column1Key]}</span>
                <span className="option-col2">{option[column2Key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <div className="invalid-feedback" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
};

export default Dropdown2;
