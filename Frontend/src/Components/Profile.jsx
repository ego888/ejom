import React from "react";
import Button from "./UI/Button";

const Profile = () => {
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
    </div>
  );
};

export default Profile;
