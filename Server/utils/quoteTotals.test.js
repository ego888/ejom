import test from "node:test";
import assert from "node:assert/strict";
import { calculateRevisedQuoteTotals } from "./quoteTotals.js";

test("revising quote details preserves the entered discount amount", () => {
  assert.deepEqual(
    calculateRevisedQuoteTotals({
      totalAmount: 1500,
      amountDiscount: 100,
      totalHrs: 2.5,
    }),
    {
      totalAmount: 1500,
      amountDiscount: 100,
      percentDisc: 6.67,
      grandTotal: 1400,
      totalHrs: 2.5,
    },
  );
});

test("discount cannot exceed a revised subtotal", () => {
  assert.deepEqual(
    calculateRevisedQuoteTotals({
      totalAmount: 80,
      amountDiscount: 100,
      totalHrs: 0,
    }),
    {
      totalAmount: 80,
      amountDiscount: 80,
      percentDisc: 100,
      grandTotal: 0,
      totalHrs: 0,
    },
  );
});
