export const calculateSalesIncentive = (orders, settings) => {
  const VATDivider = 1 + settings.vatPercent / 100;
  const salesIncentiveMultiplier = settings.salesIncentive / 100;
  const overrideIncentiveMultiplier = settings.overrideIncentive / 100;

  return orders.map((order) => {
    // Skip incentive if no incentive
    if (order.noIncentive) {
      return {
        ...order,
        salesIncentive: 0,
        overideIncentive: 0,
        remarks: "Item not eligible for incentive",
      };
    }

    let remarks = "";
    let salesIncentive = 0;
    let overideIncentive = 0;

    // Calculate base incentives
    if (Number(order.amount) > 0) {
      salesIncentive =
        (Number(order.amount) / Number(VATDivider)) *
        Number(salesIncentiveMultiplier);
      overideIncentive =
        (Number(order.amount) / Number(VATDivider)) *
        Number(overrideIncentiveMultiplier);
    } else {
      return {
        ...order,
        salesIncentive: 0,
        overideIncentive: 0,
        remarks: "Item zero amount",
      };
    }

    // Apply half rate if applicable
    if (
      Number(order.perSqFt) < Number(settings.HalfIncentiveSqFt) &&
      Number(order.width) > 0
    ) {
      salesIncentive *= 0.5;
      overideIncentive *= 0.5;
      remarks = "Half rate";
    }

    // Apply discount reduction if applicable
    if (Number(order.percentDisc) > 0) {
      const discountMultiplier = 1 - Number(order.percentDisc) / 100;
      salesIncentive *= discountMultiplier;
      overideIncentive *= discountMultiplier;
      if (Number(order.percentDisc) > 0) {
        remarks = remarks
          ? `${remarks}, ${order.percentDisc}% discount`
          : `${order.percentDisc}% discount`;
      }
    }

    return {
      ...order,
      salesIncentive,
      overideIncentive,
      remarks,
    };
  });
};
