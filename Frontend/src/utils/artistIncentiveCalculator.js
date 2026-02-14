export const calculateArtistIncentive = (orders, settings) => {
  const vatDivider = 1 + (Number(settings.vatPercent) || 0) / 100;
  const artistMaxPercent = (Number(settings.ArtistMaxPercent) || 0) / 100;
  const artistMinAmount = Number(settings.ArtistMinAmount) || 0;
  const halfIncentiveSqFt = Number(settings.HalfIncentiveSqFt) || 0;
  const majorRate = Number(settings.major) || 0;
  const minorRate = Number(settings.minor) || 0;

  let currentOrderId = null;
  let remainingMaxIncentive = 0;
  let maxOrderIncentive = 0;

  return orders.map((order) => {
    const grandTotal = Number(order.grandTotal) || 0;
    const major = Number(order.major) || 0;
    const minor = Number(order.minor) || 0;
    const quantity = Number(order.quantity) || 0;
    const perSqFt = Number(order.perSqFt) || 0;
    const materialPrefix = (order.materialName || "").slice(0, 2);

    // Reset max incentive when we encounter a new order
    if (currentOrderId !== order.orderId) {
      currentOrderId = order.orderId;
      maxOrderIncentive = (grandTotal / vatDivider) * artistMaxPercent;
      remainingMaxIncentive = maxOrderIncentive;
    }
    let remarks = "";

    // Skip incentive if no incentive or below minimum
    if (order.noIncentive || grandTotal < artistMinAmount) {
      return {
        ...order,
        originalMajor: major,
        originalMinor: minor,
        adjustedMajor: 0,
        adjustedMinor: 0,
        majorAmount: 0,
        minorAmount: 0,
        maxOrderIncentive,
        totalIncentive: 0,
        remarks: order.noIncentive
          ? "Item not eligible for incentive"
          : "Amount below minimum",
      };
    }

    // Calculate adjusted quantities for overflow
    let adjustedMajor = major;
    let adjustedMinor = minor;

    const overflow = minor + major - quantity;
    if (overflow > 0) {
      adjustedMajor = Math.min(major, quantity);
      adjustedMinor = Math.min(minor, quantity - adjustedMajor);
      remarks = "Overflow";
    }

    // Calculate amounts
    const halfRate = perSqFt < halfIncentiveSqFt && materialPrefix !== "DS";

    const rateMultiplier = halfRate ? 0.5 : 1;
    if (halfRate) {
      remarks = remarks ? remarks + ", Half rate" : "Half rate";
    }

    const majorAmount = adjustedMajor * majorRate * rateMultiplier;
    const minorAmount = adjustedMinor * minorRate * rateMultiplier;

    // Calculate total incentive (capped by remaining max incentive)
    const rawIncentive = majorAmount + minorAmount;
    const totalIncentive = Number(
      Math.min(rawIncentive, remainingMaxIncentive).toFixed(2)
    );

    // Update remaining max incentive for next item in same order
    remainingMaxIncentive -= totalIncentive;

    if (rawIncentive > totalIncentive) {
      remarks = remarks ? remarks + ", Incentive capped" : "Incentive capped";
    }

    return {
      ...order,
      originalMajor: major,
      originalMinor: minor,
      adjustedMajor,
      adjustedMinor,
      majorAmount,
      minorAmount,
      maxOrderIncentive,
      totalIncentive,
      remarks,
    };
  });
};
