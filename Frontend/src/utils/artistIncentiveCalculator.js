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
        (Number(order.grandTotal) / (1 + Number(settings.vatPercent) / 100)) *
        (Number(settings.ArtistMaxPercent) / 100);
      remainingMaxIncentive = maxOrderIncentive;
    }
    remarks = "";

    // Skip incentive if no incentive or below minimum
    if (
      order.noIncentive ||
      Number(order.grandTotal) < Number(settings.ArtistMinAmount)
    ) {
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
    const originalMajor = Number(order.major);
    const originalMinor = Number(order.minor);

    // Calculate adjusted quantities for overflow
    let adjustedMajor = Number(order.major);
    let adjustedMinor = Number(order.minor);

    const overflow =
      Number(order.minor) + Number(order.major) - Number(order.quantity);
    if (overflow > 0) {
      adjustedMajor = Math.min(Number(order.major), Number(order.quantity));
      adjustedMinor = Math.min(
        Number(order.minor),
        Number(order.quantity) - adjustedMajor
      );
      remarks = "Overflow";
    }

    // Calculate amounts
    const halfRate = Number(order.perSqFt) < Number(settings.HalfIncentiveSqFt);
    const rateMultiplier = halfRate ? 0.5 : 1;
    if (halfRate) {
      remarks = remarks ? remarks + ", Half rate" : "Half rate";
    }

    const majorAmount = adjustedMajor * Number(settings.major) * rateMultiplier;
    const minorAmount = adjustedMinor * Number(settings.minor) * rateMultiplier;

    // Calculate total incentive (capped by remaining max incentive)
    const rawIncentive = Number(majorAmount) + Number(minorAmount);
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
