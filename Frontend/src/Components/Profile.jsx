import React, { useState } from "react";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import Input from "./UI/Input";
import Modal from "./UI/Modal";
import { BiRectangle } from "react-icons/bi";

const Profile = () => {
  // Sample data for dropdowns
  const [selectedValue, setSelectedValue] = useState("");
  const sampleOptions = [
    { id: 1, name: "Option 1" },
    { id: 2, name: "Option 2" },
    { id: 3, name: "Option 3" },
  ];
  const sampleUnits = [{ unit: "PCS" }, { unit: "SETS" }, { unit: "ROLLS" }];

  // Sample input handlers
  const [inputValue, setInputValue] = useState("");
  const handleInputChange = (e) => setInputValue(e.target.value);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [allowanceValues, setAllowanceValues] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  return (
    <div className="px-5 mt-3">
      <h3 className="mb-4">Button Reference Guide</h3>

      {/* Regular Buttons (Medium) */}
      <section className="mb-5">
        <h5 className="mb-3">Regular Buttons (Medium)</h5>
        <div className="d-flex gap-2 mb-3">
          <Button variant="add">Add Button</Button>
          <Button variant="edit">Edit Button</Button>
          <Button variant="delete">Delete Button</Button>
          <Button variant="save">Save Button</Button>
          <Button variant="print">Print Button</Button>
          <Button variant="view">View Button</Button>
          <Button variant="cancel">Cancel Button</Button>
        </div>
      </section>

      {/* Small Buttons */}
      <section className="mb-5">
        <h5 className="mb-3">Small Buttons</h5>
        <div className="d-flex gap-2 mb-3">
          <Button variant="add" size="sm">
            Add
          </Button>
          <Button variant="edit" size="sm">
            Edit
          </Button>
          <Button variant="delete" size="sm">
            Delete
          </Button>
          <Button variant="save" size="sm">
            Save
          </Button>
          <Button variant="print" size="sm">
            Print
          </Button>
          <Button variant="view" size="sm">
            View
          </Button>
          <Button variant="cancel" size="sm">
            Cancel
          </Button>
        </div>
      </section>

      {/* Icon-Only Buttons (Medium) */}
      <section className="mb-5">
        <h5 className="mb-3">Icon-Only Buttons (Medium)</h5>
        <div className="d-flex gap-2 mb-3">
          <Button variant="add" iconOnly />
          <Button variant="edit" iconOnly />
          <Button variant="delete" iconOnly />
          <Button variant="save" iconOnly />
          <Button variant="print" iconOnly />
          <Button variant="view" iconOnly />
          <Button variant="cancel" iconOnly />
        </div>
      </section>

      {/* Icon-Only Small Buttons */}
      <section className="mb-5">
        <h5 className="mb-3">Icon-Only Small Buttons (Table Actions)</h5>
        <div className="d-flex gap-2 mb-3">
          <Button variant="add" iconOnly size="sm" />
          <Button variant="edit" iconOnly size="sm" />
          <Button variant="delete" iconOnly size="sm" />
          <Button variant="save" iconOnly size="sm" />
          <Button variant="print" iconOnly size="sm" />
          <Button variant="view" iconOnly size="sm" />
          <Button variant="cancel" iconOnly size="sm" />
        </div>
      </section>

      {/* Common Use Cases */}
      <section className="mb-5">
        <h5 className="mb-3">Common Use Cases</h5>

        {/* Main Action Button */}
        <div className="mb-4">
          <h6 className="mb-2">Main Action Button (e.g., Add New)</h6>
          <Button variant="add">Add New</Button>
        </div>

        {/* Table Actions */}
        <div className="mb-4">
          <h6 className="mb-2">Table Row Actions</h6>
          <div className="d-flex gap-2">
            <Button variant="edit" iconOnly size="sm" />
            <Button variant="delete" iconOnly size="sm" />
          </div>
        </div>

        {/* Form Actions */}
        <div className="mb-4">
          <h6 className="mb-2">Form Actions</h6>
          <div className="d-flex gap-2">
            <Button variant="save">Save Changes</Button>
            <Button variant="cancel">Cancel</Button>
          </div>
        </div>

        {/* Disabled State */}
        <div className="mb-4">
          <h6 className="mb-2">Disabled Buttons</h6>
          <div className="d-flex gap-2">
            <Button variant="save" disabled>
              Disabled Button
            </Button>
            <Button variant="edit" iconOnly disabled />
          </div>
        </div>
      </section>

      {/* Usage Code Examples */}
      <section>
        <h5 className="mb-3">Code Examples</h5>
        <pre className="bg-light p-3 rounded">
          {`// Regular Medium Button
<Button variant="add">Add New</Button>

// Small Button
<Button variant="edit" size="sm">Edit</Button>

// Medium Icon-Only Button
<Button variant="delete" iconOnly />

// Small Icon-Only Button (Table Actions)
<Button variant="edit" iconOnly size="sm" />

// Disabled Button
<Button variant="save" disabled>Save</Button>`}
        </pre>
      </section>

      {/* Dropdown Standards */}
      <section className="mt-5">
        <h5 className="mb-3">Dropdown Standards</h5>

        {/* Types */}
        <div className="mb-4">
          <h6 className="mb-2">Types</h6>
          <p>
            1. Form Dropdowns: Medium size, full width, used in forms for
            selecting options.
          </p>
          <p>
            2. Table Cell Dropdowns: Small size, compact width, used in table
            cells for inline editing.
          </p>
        </div>

        {/* Common Use Cases */}
        <div className="mb-4">
          <h6 className="mb-2">Common Use Cases</h6>
          <p>
            1. Form Fields: Used in client and employee forms for selection.
          </p>
          <p>
            2. Table Cells: Used in order details for unit and material
            selection.
          </p>
        </div>

        {/* Props */}
        <div className="mb-4">
          <h6 className="mb-2">Props</h6>
          <p>variant: "form" | "table" - Determines the size and styling</p>
          <p>id: string - Unique identifier</p>
          <p>name: string - Form field name</p>
          <p>value: string | number - Selected value</p>
          <p>onChange: function - Handler for value changes</p>
          <p>options: array - Array of options to display</p>
          <p>placeholder: string - Default text when no option selected</p>
          <p>labelKey: string - Property name to display from options</p>
          <p>valueKey: string - Property name to use as value from options</p>
        </div>

        {/* Layout */}
        <div className="mb-4">
          <h6 className="mb-2">Layout</h6>
          <p>Form dropdowns should be full width of their container</p>
          <p>Table dropdowns should fit within table cell width</p>
          <p>Always include a descriptive label for form dropdowns</p>
          <p>Use placeholder text that helps identify the type of selection</p>
        </div>

        {/* Styling */}
        <div className="mb-4">
          <h6 className="mb-2">Styling</h6>
          <p>Form dropdowns use Bootstrap's form-select base styles</p>
          <p>Table dropdowns use a more compact styling</p>
          <p>Both maintain consistent hover and focus states</p>
          <p>Disabled state reduces opacity and shows not-allowed cursor</p>
        </div>

        {/* Sample Dropdowns */}
        <section className="mb-5">
          <h6 className="mb-3">Form Dropdown Examples</h6>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Regular Form Dropdown</label>
              <Dropdown
                variant="form"
                id="sample"
                name="sample"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                options={sampleOptions}
                placeholder="Select an option"
                labelKey="name"
                valueKey="id"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Disabled Form Dropdown</label>
              <Dropdown
                variant="form"
                id="disabled"
                name="disabled"
                value=""
                onChange={() => {}}
                options={sampleOptions}
                placeholder="Select an option"
                labelKey="name"
                valueKey="id"
                disabled
              />
            </div>
          </div>
        </section>

        <section className="mb-5">
          <h6 className="mb-3">Table Cell Dropdown Examples</h6>
          <div className="d-flex gap-3 align-items-end">
            <div style={{ width: "150px" }}>
              <Dropdown
                variant="table"
                id="unit"
                name="unit"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                options={sampleUnits}
                placeholder="Select Unit"
                labelKey="unit"
                valueKey="unit"
              />
            </div>
            <div style={{ width: "150px" }}>
              <Dropdown
                variant="table"
                id="disabled-table"
                name="disabled-table"
                value=""
                onChange={() => {}}
                options={sampleUnits}
                placeholder="Select Unit"
                labelKey="unit"
                valueKey="unit"
                disabled
              />
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-5">
          <h6 className="mb-3">Code Examples</h6>
          <pre className="bg-light p-3 rounded">
            {`// Form Dropdown
<Dropdown
  variant="form"
  id="category"
  name="category"
  value={data.category_id}
  onChange={(e) => setData({
    ...data,
    category_id: parseInt(e.target.value)
  })}
  options={categories}
  placeholder="Select Category"
  labelKey="name"
  valueKey="id"
/>

// Table Cell Dropdown
<Dropdown
  variant="table"
  id="unit"
  name="unit"
  value={detail.unit}
  onChange={(e) => handleDetailChange(e, 'unit')}
  options={units}
  placeholder="Select Unit"
  labelKey="unit"
  valueKey="unit"
/>`}
          </pre>
        </section>
      </section>

      {/* Input Standards */}
      <section className="mt-5">
        <h3 className="mb-4">Input Standards</h3>

        {/* Form Input Examples */}
        <section className="mb-5">
          <h5 className="mb-3">Form Inputs</h5>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Regular Text Input</label>
              <Input
                variant="form"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter text"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Disabled Input</label>
              <Input
                variant="form"
                value="Disabled value"
                onChange={() => {}}
                disabled
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Number Input</label>
              <Input
                variant="form"
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter number"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Read-only Input</label>
              <Input
                variant="form"
                value="Read-only value"
                onChange={() => {}}
                readOnly
              />
            </div>
          </div>
        </section>

        {/* Table Input Examples */}
        <section className="mb-5">
          <h5 className="mb-3">Table Inputs</h5>
          <div className="d-flex gap-3 align-items-end">
            <div style={{ width: "150px" }}>
              <Input
                variant="table"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Regular"
              />
            </div>
            <div style={{ width: "150px" }}>
              <Input
                variant="table"
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Number"
              />
            </div>
            <div style={{ width: "150px" }}>
              <Input
                variant="table"
                value="Disabled"
                onChange={() => {}}
                disabled
              />
            </div>
            <div style={{ width: "150px" }}>
              <Input
                variant="table"
                value="Read-only"
                onChange={() => {}}
                readOnly
              />
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-5">
          <h5 className="mb-3">Code Examples</h5>
          <pre className="bg-light p-3 rounded">
            {`// Form Input
<Input
  variant="form"
  type="text"
  id="name"
  name="name"
  value={value}
  onChange={handleChange}
  placeholder="Enter name"
/>

// Table Input
<Input
  variant="table"
  type="number"
  value={detail.quantity}
  onChange={(e) => handleDetailChange(e, 'quantity')}
  min={0}
  step={1}
/>

// Disabled Input
<Input
  variant="form"
  value={value}
  onChange={handleChange}
  disabled
/>

// Read-only Input
<Input
  variant="form"
  value={value}
  onChange={handleChange}
  readOnly
/>`}
          </pre>
        </section>

        {/* Props Documentation */}
        <section className="mb-5">
          <h5 className="mb-3">Props</h5>
          <div className="mb-4">
            <p>
              <code>variant</code>: "form" | "table" - Determines the size and
              styling
            </p>
            <p>
              <code>type</code>: string - HTML input type (text, number, etc.)
            </p>
            <p>
              <code>id</code>: string - Unique identifier
            </p>
            <p>
              <code>name</code>: string - Form field name
            </p>
            <p>
              <code>value</code>: string | number - Input value
            </p>
            <p>
              <code>onChange</code>: function - Handler for value changes
            </p>
            <p>
              <code>placeholder</code>: string - Placeholder text
            </p>
            <p>
              <code>disabled</code>: boolean - Whether the input is disabled
            </p>
            <p>
              <code>readOnly</code>: boolean - Whether the input is read-only
            </p>
            <p>
              <code>min</code>: number - Minimum value (for number inputs)
            </p>
            <p>
              <code>max</code>: number - Maximum value (for number inputs)
            </p>
            <p>
              <code>step</code>: number - Step value (for number inputs)
            </p>
          </div>
        </section>
      </section>

      {/* Modal Standards */}
      <section className="mt-5">
        <h3 className="mb-4">Modal Standards</h3>

        {/* Types */}
        <section className="mb-5">
          <h5 className="mb-3">Types</h5>
          <div className="mb-4">
            <p>1. Form Modal: Used for forms and data entry</p>
            <ul>
              <li>Centered on screen with backdrop</li>
              <li>Header with title and close button</li>
              <li>Body for content</li>
              <li>Footer for action buttons</li>
            </ul>
            <p>2. Tooltip Modal: Used for quick information display</p>
            <ul>
              <li>Positioned relative to trigger element</li>
              <li>No header or footer</li>
              <li>Lightweight and compact</li>
            </ul>
          </div>
        </section>

        {/* Props */}
        <section className="mb-5">
          <h5 className="mb-3">Props</h5>
          <div className="mb-4">
            <p>
              <code>variant</code>: "form" | "tooltip" - Modal type
            </p>
            <p>
              <code>show</code>: boolean - Controls visibility
            </p>
            <p>
              <code>onClose</code>: function - Handler for closing modal
            </p>
            <p>
              <code>title</code>: string - Modal title (form variant only)
            </p>
            <p>
              <code>children</code>: ReactNode - Modal content
            </p>
            <p>
              <code>footer</code>: ReactNode - Footer content (form variant
              only)
            </p>
            <p>
              <code>position</code>: {"{"} x: number, y: number {"}"} - Position
              for tooltip variant
            </p>
            <p>
              <code>className</code>: string - Additional CSS classes
            </p>
          </div>
        </section>

        {/* Working Examples */}
        <section className="mb-5">
          <h5 className="mb-3">Working Examples</h5>

          {/* Form Modal Example */}
          <div className="mb-4">
            <h6>Form Modal</h6>
            <Button variant="edit" onClick={() => setShowFormModal(true)}>
              Open Form Modal
            </Button>
            <Modal
              variant="form"
              show={showFormModal}
              onClose={() => setShowFormModal(false)}
              title="Edit Allowance"
              footer={
                <div className="d-flex justify-content-end gap-2">
                  <Button
                    variant="cancel"
                    onClick={() => setShowFormModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="save"
                    onClick={() => {
                      // Save logic here
                      setShowFormModal(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              }
            >
              <div className="row g-3">
                <div className="col-6">
                  <Input
                    variant="form"
                    type="number"
                    label="Top Allowance"
                    value={allowanceValues.top}
                    onChange={(e) =>
                      setAllowanceValues((prev) => ({
                        ...prev,
                        top: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-6">
                  <Input
                    variant="form"
                    type="number"
                    label="Bottom Allowance"
                    value={allowanceValues.bottom}
                    onChange={(e) =>
                      setAllowanceValues((prev) => ({
                        ...prev,
                        bottom: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-6">
                  <Input
                    variant="form"
                    type="number"
                    label="Left Allowance"
                    value={allowanceValues.left}
                    onChange={(e) =>
                      setAllowanceValues((prev) => ({
                        ...prev,
                        left: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-6">
                  <Input
                    variant="form"
                    type="number"
                    label="Right Allowance"
                    value={allowanceValues.right}
                    onChange={(e) =>
                      setAllowanceValues((prev) => ({
                        ...prev,
                        right: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </Modal>
          </div>

          {/* Tooltip Modal Example */}
          <div className="mb-4">
            <h6>Tooltip Modal</h6>
            <div
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left,
                  y: rect.bottom + 5,
                });
                setShowTooltip(true);
              }}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Button
                variant="view"
                iconOnly
                size="sm"
                icon={<BiRectangle size={14} />}
              />
            </div>
            <Modal
              variant="tooltip"
              show={showTooltip}
              position={tooltipPosition}
            >
              <div className="text-center mb-1">Print Hrs: 1.5</div>
              <div>
                <div>Top: 0.5</div>
                <div>Bottom: 0.5</div>
                <div>Left: 0.25</div>
                <div>Right: 0.25</div>
              </div>
            </Modal>
          </div>
        </section>

        {/* State Management */}
        <section className="mb-5">
          <h5 className="mb-3">State Management</h5>
          <pre className="bg-light p-3 rounded">
            {`// Modal visibility state
const [showFormModal, setShowFormModal] = useState(false);
const [showTooltip, setShowTooltip] = useState(false);

// Form values state
const [allowanceValues, setAllowanceValues] = useState({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
});

// Tooltip position state
const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });`}
          </pre>
        </section>

        {/* Layout Standards */}
        <section className="mb-5">
          <h5 className="mb-3">Layout Standards</h5>
          <div className="mb-4">
            <p>Form Modal:</p>
            <ul>
              <li>Maximum width of 500px</li>
              <li>Centered vertically and horizontally</li>
              <li>Semi-transparent backdrop</li>
              <li>Right-aligned footer buttons with gap-2 spacing</li>
            </ul>
            <p>Tooltip Modal:</p>
            <ul>
              <li>Compact size based on content</li>
              <li>Positioned near trigger element</li>
              <li>No padding for better space efficiency</li>
            </ul>
          </div>
        </section>
      </section>

      {/* Table Standards */}
      <section className="mt-5">
        <h3 className="mb-4">Table Standards</h3>

        {/* Types */}
        <section className="mb-5">
          <h5 className="mb-3">Types</h5>
          <div className="mb-4">
            <p>1. List View Tables: Used for displaying data records</p>
            <ul>
              <li>Responsive with horizontal scroll on mobile</li>
              <li>Action buttons aligned center in last column</li>
              <li>
                Consistent cell padding (2px for order details, standard for
                others)
              </li>
            </ul>
            <p>2. Order Detail Tables: Used for order line items</p>
            <ul>
              <li>Compact design with minimal padding</li>
              <li>Input fields and dropdowns fit within cells</li>
              <li>Right-aligned numeric values</li>
            </ul>
          </div>
        </section>

        {/* Layout */}
        <section className="mb-5">
          <h5 className="mb-3">Layout Standards</h5>
          <div className="mb-4">
            <p>Header:</p>
            <ul>
              <li>Bold text with light background</li>
              <li>Text aligned left for text columns</li>
              <li>Text aligned right for numeric columns</li>
              <li>Actions column centered</li>
            </ul>
            <p>Body:</p>
            <ul>
              <li>Alternating row background for better readability</li>
              <li>Vertical align middle for all cells</li>
              <li>2px padding for order details cells</li>
              <li>Standard padding for list view cells</li>
            </ul>
          </div>
        </section>

        {/* Code Example */}
        <section className="mb-5">
          <h5 className="mb-3">Code Example</h5>
          <pre className="bg-light p-3 rounded">
            {`// List View Table
<table className="table table-hover">
  <thead>
    <tr>
      <th>Name</th>
      <th className="text-end">Amount</th>
      <th className="text-center">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sample Name</td>
      <td className="text-end">1,234.56</td>
      <td className="text-center">
        <div className="d-flex justify-content-center gap-2">
          <Button variant="edit" iconOnly size="sm" />
          <Button variant="delete" iconOnly size="sm" />
        </div>
      </td>
    </tr>
  </tbody>
</table>

// Order Details Table
<table className="table table-hover order-table">
  <thead>
    <tr>
      <th>Description</th>
      <th className="text-end">Qty</th>
      <th>Unit</th>
      <th className="text-end">Price</th>
      <th className="text-center">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <Input variant="table" value={description} />
      </td>
      <td>
        <Input variant="table" type="number" value={quantity} />
      </td>
      <td>
        <Dropdown variant="table" options={units} />
      </td>
      <td className="text-end">1,234.56</td>
      <td className="text-center">
        <div className="d-flex justify-content-center gap-2">
          <Button variant="edit" iconOnly size="sm" />
          <Button variant="delete" iconOnly size="sm" />
        </div>
      </td>
    </tr>
  </tbody>
</table>`}
          </pre>
        </section>
      </section>

      {/* Form Layout Standards */}
      <section className="mt-5">
        <h3 className="mb-4">Form Layout Standards</h3>

        {/* Grid System */}
        <section className="mb-5">
          <h5 className="mb-3">Grid System</h5>
          <div className="mb-4">
            <p>1. Two-Column Layout:</p>
            <ul>
              <li>Use col-md-6 for side-by-side fields</li>
              <li>Stack vertically on mobile (below md breakpoint)</li>
              <li>Consistent gap-3 between rows</li>
            </ul>
            <p>2. Full-Width Fields:</p>
            <ul>
              <li>Use col-12 for long text fields (e.g., notes)</li>
              <li>Address fields typically full width</li>
            </ul>
          </div>
        </section>

        {/* Field Styling */}
        <section className="mb-5">
          <h5 className="mb-3">Field Styling</h5>
          <div className="mb-4">
            <p>Labels:</p>
            <ul>
              <li>Use form-label class</li>
              <li>Required fields indicated with *</li>
              <li>Consistent capitalization</li>
            </ul>
            <p>Inputs:</p>
            <ul>
              <li>Consistent height across all form controls</li>
              <li>Error state with red border and error message</li>
              <li>Disabled state with reduced opacity</li>
            </ul>
          </div>
        </section>

        {/* Code Example */}
        <section className="mb-5">
          <h5 className="mb-3">Code Example</h5>
          <pre className="bg-light p-3 rounded">
            {`<form onSubmit={handleSubmit}>
  <div className="row g-3">
    {/* Two-Column Layout */}
    <div className="col-md-6">
      <label className="form-label">
        Client Name *
      </label>
      <Input
        variant="form"
        value={data.name}
        onChange={handleChange}
        name="name"
        required
      />
    </div>
    <div className="col-md-6">
      <label className="form-label">
        Contact Person
      </label>
      <Input
        variant="form"
        value={data.contact}
        onChange={handleChange}
        name="contact"
      />
    </div>

    {/* Full-Width Field */}
    <div className="col-12">
      <label className="form-label">
        Address
      </label>
      <Input
        variant="form"
        value={data.address}
        onChange={handleChange}
        name="address"
      />
    </div>

    {/* Form Actions */}
    <div className="col-12">
      <div className="d-flex justify-content-end gap-2">
        <Button variant="cancel">
          Cancel
        </Button>
        <Button variant="save" type="submit">
          Save
        </Button>
      </div>
    </div>
  </div>
</form>`}
          </pre>
        </section>
      </section>

      {/* Search and Filter Standards */}
      <section className="mt-5">
        <h3 className="mb-4">Search and Filter Standards</h3>

        {/* Components */}
        <section className="mb-5">
          <h5 className="mb-3">Components</h5>
          <div className="mb-4">
            <p>1. Search Input:</p>
            <ul>
              <li>Full width on mobile, auto width on desktop</li>
              <li>Search icon prefix</li>
              <li>Clear button when has value</li>
            </ul>
            <p>2. Filter Dropdowns:</p>
            <ul>
              <li>Multiple selection support</li>
              <li>Clear selection option</li>
              <li>Checkbox style for multi-select</li>
            </ul>
          </div>
        </section>

        {/* Layout */}
        <section className="mb-5">
          <h5 className="mb-3">Layout Standards</h5>
          <div className="mb-4">
            <p>Positioning:</p>
            <ul>
              <li>Search input aligned left</li>
              <li>Filter dropdowns after search input</li>
              <li>Action buttons (Add New, etc.) aligned right</li>
              <li>Consistent gap-2 between elements</li>
            </ul>
          </div>
        </section>

        {/* Code Example */}
        <section className="mb-5">
          <h5 className="mb-3">Code Example</h5>
          <pre className="bg-light p-3 rounded">
            {`<div className="d-flex flex-wrap gap-2 mb-3">
  {/* Search Input */}
  <div className="flex-grow-1">
    <Input
      variant="form"
      placeholder="Search..."
      value={searchQuery}
      onChange={handleSearch}
      className="search-input"
    />
  </div>

  {/* Filter Dropdowns */}
  <div className="d-flex gap-2">
    <Dropdown
      variant="form"
      options={statusOptions}
      value={selectedStatus}
      onChange={handleStatusChange}
      placeholder="Status"
    />
    <Dropdown
      variant="form"
      options={categoryOptions}
      value={selectedCategory}
      onChange={handleCategoryChange}
      placeholder="Category"
    />
  </div>

  {/* Action Button */}
  <div className="ms-auto">
    <Button variant="add">
      Add New
    </Button>
  </div>
</div>`}
          </pre>
        </section>
      </section>
    </div>
  );
};

export default Profile;
