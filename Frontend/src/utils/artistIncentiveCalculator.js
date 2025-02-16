export const calculateArtistIncentive = (orders, settings) => {
  let currentOrderId = null;
  let remainingMaxIncentive = 0;
  let maxOrderIncentive = 0;
  let remarks = "";

  return orders.map((order) => {
    // Reset max incentive when we encounter a new order
    if (currentOrderId !== order.orderId) {
      currentOrderId = order.orderId;
      maxOrderIncentive =
        (order.grandTotal / (1 + settings.vatPercent / 100)) *
        (settings.ArtistMaxPercent / 100);
      remainingMaxIncentive = maxOrderIncentive;
    }
    remarks = "";

    // Skip incentive if no incentive or below minimum
    if (order.noIncentive || order.grandTotal < settings.ArtistMinAmount) {
      return {
        ...order,
        originalMajor: order.major,
        originalMinor: order.minor,
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

    // Store original values
    const originalMajor = order.major;
    const originalMinor = order.minor;

    // Calculate adjusted quantities for overflow
    let adjustedMajor = order.major;
    let adjustedMinor = order.minor;

    const overflow = order.minor + order.major - order.quantity;
    if (overflow > 0) {
      adjustedMajor = Math.min(order.major, order.quantity);
      adjustedMinor = Math.min(order.minor, order.quantity - adjustedMajor);
      remarks = "Overflow";
    }

    // Calculate amounts
    const halfRate = order.perSqFt < settings.HalfIncentiveSqFt;
    const rateMultiplier = halfRate ? 0.5 : 1;
    if (halfRate) {
      remarks = remarks ? remarks + ", Half rate" : "Half rate";
    }

    const majorAmount = adjustedMajor * settings.major * rateMultiplier;
    const minorAmount = adjustedMinor * settings.minor * rateMultiplier;

    // Calculate total incentive (capped by remaining max incentive)
    const rawIncentive = majorAmount + minorAmount;
    const totalIncentive = Math.min(rawIncentive, remainingMaxIncentive);

    // Update remaining max incentive for next item in same order
    remainingMaxIncentive -= totalIncentive;

    if (rawIncentive > totalIncentive) {
      remarks = remarks ? remarks + ", Incentive capped" : "Incentive capped";
    }

    return {
      ...order,
      originalMajor,
      originalMinor,
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
