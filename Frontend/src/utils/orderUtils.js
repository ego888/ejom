// Validation function
export const validateDetail = (detail) => {
  const errors = {};

  // If either width or height exists, all dimension-related fields are required
  if (detail.width || detail.height) {
    if (!detail.width || detail.width <= 0) {
      errors.width = "Width is required";
    }
    if (!detail.height || detail.height <= 0) {
      errors.height = "Height is required";
    }
    if (!detail.unit) {
      errors.unit = "Unit is required";
    }
    if (!detail.material) {
      errors.material = "Material is required";
    }
  }

  // Basic validation for quantity and discount
  if (detail.quantity && detail.quantity <= 0) {
    errors.quantity = "Quantity must be greater than 0";
  }
  if (detail.discount && (detail.discount < 0 || detail.discount > 100)) {
    errors.discount = "Discount must be between 0 and 100";
  }

  return errors;
};

// Calculation functions
export const calculateArea = (
  width,
  height,
  unit,
  quantity = 0,
  allowances = {}
) => {
  // Validate numeric inputs
  width = parseFloat(width) || 0;
  height = parseFloat(height) || 0;
  quantity = parseFloat(quantity) || 0;

  if (!width || !height || !unit) {
    return {
      squareFeet: 0,
      materialUsage: 0,
    };
  }

  // Calculate squareFeet (without allowances)
  let squareFeet = width * height;

  // Convert dimensions to square feet based on unit
  switch (unit) {
    case "IN":
      squareFeet = squareFeet / 144; // Convert from sq inches to sq feet
      break;
    case "CM":
      squareFeet = squareFeet / 929.0304; // Convert from sq cm to sq feet
      break;
    case "M":
      squareFeet = squareFeet * 10.7639; // Convert from sq meters to sq feet
      break;
    case "FT":
      // Already in square feet
      break;
  }

  // If no quantity, return only squareFeet calculation
  if (!quantity) {
    return {
      squareFeet: parseFloat(squareFeet.toFixed(2)),
      materialUsage: 0,
    };
  }

  // Calculate materialUsage (with allowances)
  // First convert width and height to inches for allowance calculations
  let widthInInches, heightInInches;
  switch (unit) {
    case "IN":
      widthInInches = width;
      heightInInches = height;
      break;
    case "CM":
      widthInInches = width / 2.54;
      heightInInches = height / 2.54;
      break;
    case "M":
      widthInInches = width / 0.0254;
      heightInInches = height / 0.0254;
      break;
    case "FT":
      widthInInches = width * 12;
      heightInInches = height * 12;
      break;
  }

  // Add allowances (in inches)
  const totalWidthInInches =
    widthInInches +
    parseFloat(allowances.left || 0) +
    parseFloat(allowances.right || 0);
  const totalHeightInInches =
    heightInInches +
    parseFloat(allowances.top || 0) +
    parseFloat(allowances.bottom || 0);

  // Convert back to square feet and multiply by quantity
  const materialUsage =
    ((totalWidthInInches * totalHeightInInches) / 144) * quantity;

  console.log("Width:", totalWidthInInches);
  console.log("Height:", totalHeightInInches);
  console.log("Quantity:", quantity);
  console.log("Square Feet:", squareFeet);
  console.log("Material Usage:", materialUsage);
  console.log("Allowances:", allowances);

  return {
    squareFeet: parseFloat(squareFeet.toFixed(2)),
    materialUsage: parseFloat(materialUsage.toFixed(2)),
  };
};

export const calculatePerSqFt = (price, area) => {
  if (!price || !area || area === 0) return 0;
  return parseFloat((parseFloat(price) / parseFloat(area)).toFixed(2));
};

export const calculatePrice = (squareFeet, perSqFt) => {
  if (!squareFeet || !perSqFt) return 0;
  return parseFloat((parseFloat(squareFeet) * parseFloat(perSqFt)).toFixed(2));
};

export const calculateAmount = (price, discount, quantity) => {
  if (!price || !quantity) return 0;
  const discountAmount =
    parseFloat(price) *
    parseFloat(quantity) *
    (parseFloat(discount || 0) / 100);
  return parseFloat(
    (parseFloat(price) * parseFloat(quantity) - discountAmount).toFixed(2)
  );
};

export const calculateTotals = (
  orderDetails,
  discAmount = 0,
  percentDisc = 0
) => {
  // Initialize variables for aggregation
  let subtotal = 0;
  let totalHrs = 0;

  // Single iteration over the array
  orderDetails.forEach((detail) => {
    subtotal += parseFloat(detail.amount || 0);
    totalHrs += parseFloat(detail.printHrs || 0);
  });
  console.log("Total Hrs:", totalHrs);
  // Calculate discount and grand total
  const totalDiscount =
    parseFloat(discAmount) + subtotal * (parseFloat(percentDisc) / 100);
  const grandTotal = subtotal - totalDiscount;

  return {
    subtotal,
    totalDiscount,
    grandTotal,
    totalHrs,
  };
};

export const calculateOrderTotals = (subtotal, discAmount, percentDisc) => {
  subtotal = parseFloat(subtotal);
  if (isNaN(subtotal) || subtotal < 0) return null;

  // If discount amount was changed
  if (discAmount !== undefined) {
    discAmount = parseFloat(discAmount);
    if (isNaN(discAmount) || discAmount < 0) return null;

    const newPercentDisc = ((discAmount / subtotal) * 100).toFixed(2);
    const newGrandTotal = subtotal - discAmount;
    return {
      subtotal,
      discAmount: parseFloat(discAmount),
      percentDisc: parseFloat(newPercentDisc),
      grandTotal: newGrandTotal,
    };
  }
  // If percent discount was changed
  if (percentDisc !== undefined) {
    const newDiscAmount = ((subtotal * percentDisc) / 100).toFixed(2);
    const newGrandTotal = subtotal - newDiscAmount;
    return {
      subtotal,
      discAmount: parseFloat(newDiscAmount),
      percentDisc: parseFloat(percentDisc),
      grandTotal: newGrandTotal,
    };
  }
};

// Format number helper
export const formatNumber = (num) => {
  if (num === null || num === undefined) return 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

{
  /* USAGE:
  <span className="number_right peso">
  {formatPeso(detail.amount)}
</span> */
}
export const formatPeso = (num) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
};

// API error handler
export const handleApiError = (err, navigate, setAlert) => {
  if (err.response?.status === 401) {
    setAlert({
      show: true,
      title: "Error",
      message: "Your session has expired. Please log out and log in again.",
      type: "alert",
    });
    localStorage.removeItem("token");
    navigate("/");
  } else {
    setAlert({
      show: true,
      title: "Error",
      message: err.response?.data?.Error || "An error occurred",
      type: "alert",
    });
  }
};

export const calculatePrintHrs = (
  squareFeet,
  quantity,
  material,
  materials
) => {
  if (!squareFeet || !quantity || !material || !materials) return 0;
  const materialObj = materials.find((m) => m.Material === material);
  if (!materialObj || !materialObj.SqFtPerHour) return 0;
  return parseFloat(
    (
      (parseFloat(squareFeet) * parseFloat(quantity)) /
      parseFloat(materialObj.SqFtPerHour)
    ).toFixed(2)
  );
};

// Helper function for date formatting
export const formatDateTime = (date) => {
  return new Date(date)
    .toLocaleString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

export const formatDate = (date) => {
  return new Date(date)
    .toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(",", "");
};

export const formatTime = (timeString) => {
  if (!timeString) return "-";
  return timeString.substring(0, 5);
};

export const validateOrderData = (data) => {
  // ... existing code ...
};
