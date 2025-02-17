import React from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaPrint,
  FaEye,
  FaTimes,
} from "react-icons/fa";
import "./Button.css";

const Button = ({
  variant = "primary",
  size = "md",
  iconOnly = false,
  icon = null,
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  ...props
}) => {
  const getIcon = () => {
    if (icon) return icon;

    switch (variant) {
      case "add":
        return <FaPlus aria-hidden="true" />;
      case "edit":
        return <FaEdit aria-hidden="true" />;
      case "delete":
        return <FaTrash aria-hidden="true" />;
      case "save":
        return <FaSave aria-hidden="true" />;
      case "print":
        return <FaPrint aria-hidden="true" />;
      case "view":
        return <FaEye aria-hidden="true" />;
      case "cancel":
        return <FaTimes aria-hidden="true" />;
      default:
        return null;
    }
  };

  const getButtonClass = () => {
    // Base classes using Bootstrap
    const baseClass = "btn";

    // Map our variants to Bootstrap variants
    const variantMap = {
      add: "success",
      edit: "info btn-edit",
      delete: "danger",
      save: "success",
      print: "secondary btn-print",
      view: "primary",
      cancel: "warning btn-cancel",
      warning: "warning",
      success: "success",
      danger: "danger",
      info: "info",
    };

    const variantClass = `btn-${variantMap[variant] || variant}`;
    const sizeClass = size !== "md" ? `btn-${size}` : "";
    const iconOnlyClass = iconOnly ? "btn-icon-only" : "";

    return `${baseClass} ${variantClass} ${sizeClass} ${iconOnlyClass} ${className}`.trim();
  };

  // Get appropriate aria-label based on variant if iconOnly
  const getAriaLabel = () => {
    if (!iconOnly) return props["aria-label"];

    const labelMap = {
      add: "Add new item",
      edit: "Edit item",
      delete: "Delete item",
      save: "Save changes",
      print: "Print",
      view: "View details",
      cancel: "Cancel",
    };

    return labelMap[variant] || props["aria-label"];
  };

  return (
    <button
      type={type}
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled}
      aria-label={getAriaLabel()}
      {...props}
    >
      {iconOnly ? (
        <span className="icon-wrapper" aria-hidden="true">
          {getIcon()}
        </span>
      ) : (
        <>{children}</>
      )}
    </button>
  );
};

export default Button;
