export const calculateIncentives = (orders, settings) => {
  return orders.map((order) => {
    // Calculate max incentive for this order
    const maxOrderIncentive =
      (order.grandTotal / settings.VAT) * (settings.ArtistMaxPercent / 100);

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
      adjustedMajor,
      adjustedMinor,
      majorAmount,
      minorAmount,
      maxOrderIncentive,
      totalIncentive,
    };
  });
};
