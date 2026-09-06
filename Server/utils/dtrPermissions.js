export const DTR_PERMISSION_KEYS = new Set([
  "dtr.batches",
  "dtr.import",
  "dtr.calendar",
  "dtr.assignments",
  "dtr.groups",
  "dtr.shifts",
  "dtr.overrides",
  "dtr.holidays",
  "dtr.monthly",
  "dtr.absences",
]);

export const normalizeDtrPermissions = (value) => {
  let permissions = value;
  if (typeof permissions === "string") {
    try { permissions = JSON.parse(permissions); } catch { permissions = []; }
  }
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.filter((key) => DTR_PERMISSION_KEYS.has(key)))];
};

export const loadEmployeeDtrPermissions = async (connection, employeeId) => {
  const [rows] = await connection.query(
    "SELECT permissionKey FROM EmployeeDTRPermissions WHERE employeeId=? ORDER BY permissionKey",
    [employeeId]
  );
  return rows.map((row) => row.permissionKey);
};

export const replaceEmployeeDtrPermissions = async (connection, employeeId, value) => {
  const permissions = normalizeDtrPermissions(value);
  await connection.query("DELETE FROM EmployeeDTRPermissions WHERE employeeId=?", [employeeId]);
  if (permissions.length) {
    await connection.query(
      "INSERT INTO EmployeeDTRPermissions (employeeId, permissionKey) VALUES ?",
      [permissions.map((key) => [employeeId, key])]
    );
  }
  return permissions;
};

