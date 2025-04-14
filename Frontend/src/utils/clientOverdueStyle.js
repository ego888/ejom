/**
 * Returns the appropriate background style for a client based on their hold and overdue dates
 * @param {Object} data - The client data object containing hold and overdue dates
 * @returns {Object} - Style object with backgroundColor and color properties
 */
export function getClientBackgroundStyle(data) {
  // console.log("getClientBackgroundStyle called with data:", data);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set time to midnight for accurate date comparison

  const holdDate = data.hold ? new Date(data.hold) : null;
  const overdueDate = data.overdue ? new Date(data.overdue) : null;

  // console.log("holdDate", holdDate?.toISOString());
  // console.log("today", today.toISOString());
  // console.log("overdueDate", overdueDate?.toISOString());

  if (holdDate && today > holdDate) {
    // console.log("Applying hold style");
    return { backgroundColor: "#dc3545", color: "white" }; // danger
  }

  if (overdueDate && today > overdueDate) {
    // console.log("Applying overdue style");
    return { backgroundColor: "#ffc107", color: "#212529" }; // warning
  }

  // console.log("No style applied");
  return {}; // no style
}
