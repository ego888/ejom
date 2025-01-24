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
        return <FaPlus />;
      case "edit":
        return <FaEdit />;
      case "delete":
        return <FaTrash />;
      case "save":
        return <FaSave />;
      case "print":
        return <FaPrint />;
      case "view":
        return <FaEye />;
      case "cancel":
        return <FaTimes />;
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
      edit: "info",
      delete: "danger",
      save: "success",
      print: "secondary",
      view: "primary",
      cancel: "warning",
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

  return (
    <button
      type={type}
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {iconOnly ? getIcon() : <>{children}</>}
    </button>
  );
};

export default Button;
