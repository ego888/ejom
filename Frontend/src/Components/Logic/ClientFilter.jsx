/**
 * ClientFilter Component
 * --------------------------
 * A dynamic dropdown filter for selecting clients in a table.
 * This component allows filtering clients via a search box, selecting/deselecting clients,
 * and clicking outside to close the dropdown.
 *
 * USAGE:
 * ------
 * 1. Import and include `ClientFilter` in the parent component.
 * 2. Use a `useRef()` hook to control the filter from the parent.
 * 3. Call `toggleFilterMenu(event)` to open the filter dropdown.
 *
 * Example:
 * --------
 * import { useRef, useState } from "react";
 * import ClientFilter from "./Logic/ClientFilter";
 *
 * const ParentComponent = ({ clientList }) => {
 *   const clientFilterRef = useRef(null);
 *   const [selectedClients, setSelectedClients] = useState([]);
 *   const [hasClientFilter, setHasClientFilter] = useState(false);
 *
 *   return (
 *     <>
 *       <ClientFilter
 *         ref={clientFilterRef}
 *         clientList={clientList}
 *         selectedClients={selectedClients}
 *         setSelectedClients={setSelectedClients}
 *         onFilterUpdate={({ isFilterActive }) => setHasClientFilter(isFilterActive)}
 *       />
 *
 *       <th
 *         onClick={(event) => clientFilterRef.current?.toggleFilterMenu(event)}
 *         style={{ cursor: "pointer", color: hasClientFilter ? "#0d6efd" : "inherit" }}
 *       >
 *         Client Name
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

// ForwardRef allows the parent component to control this component
const ClientFilter = forwardRef(
  (
    { clientList, selectedClients, setSelectedClients, onFilterUpdate },
    ref
  ) => {
    // State for showing/hiding the dropdown menu
    const [showClientMenu, setShowClientMenu] = useState(false);

    // Stores the position of the dropdown (relative to clicked element)
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    // Stores the search term input value
    const [searchTerm, setSearchTerm] = useState("");

    // References for handling click events
    const clientMenuRef = useRef(null);
    const searchInputRef = useRef(null);

    /**
     * Allows the parent component to trigger the filter menu when clicking a client cell.
     * The event provides the clicked element's position, which is used to place the menu.
     */
    useImperativeHandle(ref, () => ({
      toggleFilterMenu: (event) => {
        if (!event) return;

        // Get position of the clicked element
        const rect = event.target.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });

        // Pre-fill search with first 5 characters of the clicked client name
        const clickedText = event.target.textContent || "";
        setSearchTerm(clickedText.slice(0, 5));

        // Toggle dropdown menu visibility
        setShowClientMenu((prev) => !prev);
      },
    }));

    /**
     * Auto-focus on the search input when the menu opens.
     */
    useEffect(() => {
      if (showClientMenu && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [showClientMenu]);

    /**
     * Closes the dropdown when clicking outside the menu.
     */
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          clientMenuRef.current &&
          !clientMenuRef.current.contains(event.target)
        ) {
          setShowClientMenu(false);
          setSearchTerm(""); // Clear search when closing
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /**
     * Updates the parent component when selected clients change.
     * Determines if a filter is active based on the selection.
     */
    useEffect(() => {
      const isFilterActive =
        selectedClients.length > 0 &&
        selectedClients.length < clientList.length;
      onFilterUpdate({ filteredClients: selectedClients, isFilterActive });
    }, [selectedClients, clientList, onFilterUpdate]);

    /**
     * Handles selection/deselection of individual client checkboxes.
     */
    const handleClientCheckboxChange = (clientName) => {
      setSelectedClients(
        (prev) =>
          prev.includes(clientName)
            ? prev.filter((name) => name !== clientName) // Remove client from selection
            : [...prev, clientName] // Add client to selection
      );
    };

    /**
     * Filters clients based on search term.
     */
    const filteredClients = clientList.filter((client) =>
      client.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /**
     * Handles "Select All" checkbox logic - modified to only select filtered clients.
     */
    const handleCheckAllClients = () => {
      // Get all client names from the filtered list
      const filteredClientNames = filteredClients.map(
        (client) => client.clientName
      );

      // Check if all filtered clients are already selected
      const allFilteredSelected = filteredClientNames.every((name) =>
        selectedClients.includes(name)
      );

      if (allFilteredSelected) {
        // If all filtered clients are selected, deselect only those filtered clients
        setSelectedClients(
          selectedClients.filter((name) => !filteredClientNames.includes(name))
        );
      } else {
        // If not all filtered clients are selected, add all filtered clients to selection
        // First remove any filtered clients that might already be selected to avoid duplicates
        const currentlySelected = selectedClients.filter(
          (name) => !filteredClientNames.includes(name)
        );
        // Then add all filtered clients
        setSelectedClients([...currentlySelected, ...filteredClientNames]);
      }
    };

    return (
      <>
        {showClientMenu && (
          <div
            ref={clientMenuRef}
            className="client-menu"
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
            {/* Search Field */}
            <div className="client-menu-search">
              <input
                ref={searchInputRef}
                type="text"
                className="form-control form-control-sm"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Select All Checkbox - updated to check against filtered clients */}
            <div className="client-menu-header">
              <input
                type="checkbox"
                className="client-menu-checkbox"
                checked={
                  filteredClients.length > 0 &&
                  filteredClients.every((client) =>
                    selectedClients.includes(client.clientName)
                  )
                }
                onChange={handleCheckAllClients}
              />
              <span>Select All</span>
            </div>

            {/* Deselect All Checkbox - only appears when clients are selected */}
            {selectedClients.length > 0 && (
              <div className="client-menu-header" style={{ marginTop: "4px" }}>
                <input
                  type="checkbox"
                  className="client-menu-checkbox"
                  checked={true}
                  onChange={() => setSelectedClients([])}
                />
                <span>Deselect All</span>
              </div>
            )}

            {/* Selection count indicator */}
            <div
              style={{
                fontSize: "0.8rem",
                color: "#6c757d",
                textAlign: "right",
                paddingRight: "4px",
                marginTop: "4px",
              }}
            >
              {selectedClients.length} of {clientList.length} selected
            </div>

            {/* Separator line */}
            <hr style={{ margin: "8px 0", borderTop: "1px solid #dee2e6" }} />

            {/* Client List */}
            <div className="client-menu-items">
              {filteredClients.map((client) => (
                <div key={client.clientName} className="client-menu-item">
                  <input
                    type="checkbox"
                    className="client-menu-checkbox"
                    checked={selectedClients.includes(client.clientName)}
                    onChange={() =>
                      handleClientCheckboxChange(client.clientName)
                    }
                  />
                  <span>{client.clientName}</span>
                </div>
              ))}

              {/* No results message */}
              {filteredClients.length === 0 && (
                <div className="text-muted text-center p-2">
                  No clients found
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
);

export default ClientFilter;
