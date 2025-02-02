/**
 * SalesFilter Component
 * --------------------------
 * A dropdown filter for selecting sales employees in a table.
 * This component allows selecting/deselecting sales employees and
 * clicking outside to close the dropdown.
 *
 * USAGE:
 * ------
 * 1. Import and include `SalesFilter` in the parent component.
 * 2. Use a `useRef()` hook to control the filter from the parent.
 * 3. Call `toggleFilterMenu(event)` to open the filter dropdown.
 *
 * Example:
 * --------
 * import { useRef, useState } from "react";
 * import SalesFilter from "./Logic/SalesFilter";
 *
 * const ParentComponent = ({ salesEmployees }) => {
 *   const salesFilterRef = useRef(null);
 *   const [selectedSales, setSelectedSales] = useState([]);
 *   const [hasSalesFilter, setHasSalesFilter] = useState(false);
 *
 *   return (
 *     <>
 *       <SalesFilter
 *         ref={salesFilterRef}
 *         salesEmployees={salesEmployees}
 *         selectedSales={selectedSales}
 *         setSelectedSales={setSelectedSales}
 *         onFilterUpdate={({ isFilterActive }) => setHasSalesFilter(isFilterActive)}
 *       />
 *
 *       <th
 *         onClick={(event) => salesFilterRef.current?.toggleFilterMenu(event)}
 *         style={{ cursor: "pointer", color: hasSalesFilter ? "#0d6efd" : "inherit" }}
 *       >
 *         Sales
 *       </th>
 *     </>
 *   );
 * };
 */

import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

const SalesFilter = forwardRef(
  (
    { salesEmployees, selectedSales, setSelectedSales, onFilterUpdate },
    ref
  ) => {
    // State for controlling the filter menu
    const [showSalesMenu, setShowSalesMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const salesMenuRef = useRef(null);

    // Expose toggleFilterMenu method to parent component
    useImperativeHandle(ref, () => ({
      toggleFilterMenu: (event) => {
        const rect = event.target.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });
        setShowSalesMenu((prev) => !prev);
      },
    }));

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          salesMenuRef.current &&
          !salesMenuRef.current.contains(event.target)
        ) {
          setShowSalesMenu(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Notify parent component about filter status
    useEffect(() => {
      const isFilterActive =
        selectedSales.length > 0 &&
        selectedSales.length < salesEmployees.length;
      onFilterUpdate({ filteredSales: selectedSales, isFilterActive });
    }, [selectedSales, salesEmployees, onFilterUpdate]);

    // Handle individual sales selection
    const handleSalesCheckboxChange = (salesId) => {
      setSelectedSales((prev) =>
        prev.includes(salesId)
          ? prev.filter((id) => id !== salesId)
          : [...prev, salesId]
      );
    };

    // Handle select/deselect all sales
    const handleCheckAllSales = () => {
      if (selectedSales.length === salesEmployees.length) {
        setSelectedSales([]); // Clear all
      } else {
        setSelectedSales(salesEmployees.map((emp) => emp.id)); // Select all
      }
    };

    return (
      <>
        {showSalesMenu && (
          <div
            ref={salesMenuRef}
            className="sales-menu"
            style={{
              position: "fixed",
              top: menuPosition.y,
              left: menuPosition.x,
              background: "white",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              padding: "8px",
              zIndex: 1000,
              minWidth: "200px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
          >
            {/* Select all checkbox */}
            <div className="sales-menu-header">
              <input
                type="checkbox"
                className="sales-menu-checkbox"
                checked={selectedSales.length === salesEmployees.length}
                onChange={handleCheckAllSales}
              />
              <span>Select All</span>
            </div>
            {/* Sales list */}
            <div className="sales-menu-items">
              {salesEmployees.map((employee) => (
                <div key={employee.id} className="sales-menu-item">
                  <input
                    type="checkbox"
                    className="sales-menu-checkbox"
                    checked={selectedSales.includes(employee.id)}
                    onChange={() => handleSalesCheckboxChange(employee.id)}
                  />
                  <span>{employee.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
);

export default SalesFilter;
