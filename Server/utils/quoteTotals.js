const money = (value) => Number((Number.parseFloat(value) || 0).toFixed(2));

export const calculateRevisedQuoteTotals = ({
  totalAmount,
  totalHrs,
  amountDiscount,
}) => {
  const subtotal = Math.max(money(totalAmount), 0);
  const discount = Math.min(Math.max(money(amountDiscount), 0), subtotal);
  const percentDisc = subtotal > 0
    ? Number(((discount / subtotal) * 100).toFixed(2))
    : 0;

  return {
    totalAmount: subtotal,
    amountDiscount: discount,
    percentDisc,
    grandTotal: money(subtotal - discount),
    totalHrs: money(totalHrs),
  };
};
