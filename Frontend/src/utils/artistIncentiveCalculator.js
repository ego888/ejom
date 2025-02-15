export const calculateArtistIncentive = (orders, settings) => {
  return orders.map((order) => {
    // Calculate max incentive for this order
    const maxOrderIncentive =
      (order.grandTotal / (1 + settings.vatPercent / 100)) *
      (settings.ArtistMaxPercent / 100);

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

    // Calculate adjusted quantities
    let adjustedMajor = order.major;
    let adjustedMinor = order.minor;

    // Adjust if total exceeds quantity
    if (order.minor + order.major > order.quantity) {
      if (order.major >= order.minor + order.major - order.quantity) {
        adjustedMajor =
          order.major - (order.minor + order.major - order.quantity);
        adjustedMinor = order.minor;
      } else {
        adjustedMajor = 0;
        adjustedMinor = Math.max(
          order.minor -
            (order.minor + order.major - order.quantity - order.major),
          0
        );
      }
    }

    // Calculate amounts
    const halfRate = order.perSqFt < settings.HalfIncentiveSqFt;
    const rateMultiplier = halfRate ? 0.5 : 1;

    const majorAmount = adjustedMajor * settings.major * rateMultiplier;
    const minorAmount = adjustedMinor * settings.minor * rateMultiplier;

    // Calculate total incentive (capped by maxOrderIncentive)
    const totalIncentive = Math.min(
      majorAmount + minorAmount,
      maxOrderIncentive
    );

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
      remarks: halfRate ? "Half rate" : "Full rate",
    };
  });
};
