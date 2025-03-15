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
    if (order.amount > 0) {
      salesIncentive = (order.amount / VATDivider) * salesIncentiveMultiplier;
      overideIncentive =
        (order.amount / VATDivider) * overrideIncentiveMultiplier;
    } else {
      return {
        ...order,
        salesIncentive: 0,
        overideIncentive: 0,
        remarks: "Item zero amount",
      };
    }

    // Apply half rate if applicable
    if (order.perSqFt < settings.HalfIncentiveSqFt && order.width > 0) {
      salesIncentive *= 0.5;
      overideIncentive *= 0.5;
      remarks = "Half rate";
    }

    // Apply discount reduction if applicable
    if (order.percentDisc) {
      const discountMultiplier = 1 - order.percentDisc / 100;
      console.log("Order", order);
      console.log("Percent Discount", order.percentDisc);
      console.log("Discount Multiplier", discountMultiplier);
      console.log("Sales Incentive", salesIncentive);
      salesIncentive *= discountMultiplier;
      overideIncentive *= discountMultiplier;
      remarks = remarks
        ? `${remarks}, ${order.percentDisc}% discount`
        : `${order.percentDisc}% discount`;
    }

    return {
      ...order,
      salesIncentive,
      overideIncentive,
      remarks,
    };
  });
};
