export const calculateSalesIncentive = (orders, settings) => {
  const vatDivider = 1 + (Number(settings.vatPercent) || 0) / 100;
  const salesIncentiveMultiplier = (Number(settings.salesIncentive) || 0) / 100;
  const overrideIncentiveMultiplier =
    (Number(settings.overrideIncentive) || 0) / 100;
  const halfIncentiveSqFt = Number(settings.HalfIncentiveSqFt) || 0;

  return orders.map((order) => {
    const amount = Number(order.amount) || 0;
    const percentDisc = Number(order.percentDisc) || 0;
    const perSqFt = Number(order.perSqFt) || 0;
    const width = Number(order.width) || 0;

    if (order.noIncentive) {
      return {
        ...order,
        salesIncentive: 0,
        overideIncentive: 0,
        remarks: "Item not eligible for incentive",
      };
    }

    if (amount <= 0) {
      return {
        ...order,
        salesIncentive: 0,
        overideIncentive: 0,
        remarks: "Item zero amount",
      };
    }

    let remarks = "";
    let salesIncentive = (amount / vatDivider) * salesIncentiveMultiplier;
    let overideIncentive = (amount / vatDivider) * overrideIncentiveMultiplier;

    if (perSqFt < halfIncentiveSqFt && width > 0) {
      salesIncentive *= 0.5;
      overideIncentive *= 0.5;
      remarks = "Half rate";
    }

    if (percentDisc > 0) {
      const discountMultiplier = 1 - percentDisc / 100;
      salesIncentive *= discountMultiplier;
      overideIncentive *= discountMultiplier;
      remarks = remarks
        ? `${remarks}, ${percentDisc}% discount`
        : `${percentDisc}% discount`;
    }

    return {
      ...order,
      salesIncentive,
      overideIncentive,
      remarks,
    };
  });
};
