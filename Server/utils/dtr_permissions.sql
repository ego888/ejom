CREATE TABLE IF NOT EXISTS EmployeeDTRPermissions (
  employeeId INT NOT NULL,
  permissionKey VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employeeId, permissionKey),
  CONSTRAINT fk_employee_dtr_permissions_employee
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE
);

