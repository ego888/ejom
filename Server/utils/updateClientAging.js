import db from "../utils/db.js";

async function updateClientAging() {
  const now = new Date();

  const [orders] = await db.query(`
    SELECT orderId, clientId, grandTotal, amountPaid, productionDate
    FROM orders
    WHERE status IN ('Delivered', 'Billed')
  `);

  const agingMap = new Map();

  // Group orders by client and bucket them by age
  for (const order of orders) {
    const { orderId, clientId, grandTotal, amountPaid, productionDate } = order;
    if (!clientId || !productionDate) {
      continue;
    }

    const prodDate = new Date(productionDate);
    const days = Math.floor((now - prodDate) / (1000 * 60 * 60 * 24));
    const balance = parseFloat(grandTotal) - parseFloat(amountPaid || 0);

    if (balance <= 0) {
      continue;
    }

    if (!agingMap.has(clientId)) {
      agingMap.set(clientId, { over30: 0, over60: 0, over90: 0 });
    }

    const clientAging = agingMap.get(clientId);

    if (days >= 31 && days <= 60) {
      clientAging.over30 += balance;
    } else if (days >= 61 && days <= 90) {
      clientAging.over60 += balance;
    } else if (days > 90) {
      clientAging.over90 += balance;
    }
  }

  //  ❌ No aging data to update.
  if (agingMap.size === 0) {
    return;
  }

  // Update each client with their aging values + warning/hold dates
  for (const [clientId, aging] of agingMap.entries()) {
    // Get client terms and days
    const [clientRows] = await db.query(
      `SELECT c.overdue, c.hold, c.terms, pt.days as termsDays
       FROM client c
       LEFT JOIN paymentTerms pt ON c.terms = pt.terms
       WHERE c.id = ?`,
      [clientId]
    );
    const client = clientRows[0] || {};

    // Get oldest unpaid production date
    const [oldestUnpaid] = await db.query(
      `SELECT MIN(productionDate) as oldestProdDate
       FROM orders
       WHERE clientId = ? AND status IN ('Delivered', 'Billed') AND (grandTotal - amountPaid) > 0`,
      [clientId]
    );

    const oldestProductionDate = oldestUnpaid[0]?.oldestProdDate
      ? new Date(oldestUnpaid[0].oldestProdDate)
      : null;

    let overdue = null;
    let hold = null;

    if (oldestProductionDate) {
      // overdue = oldest unpaid productionDate + terms.days
      overdue = new Date(oldestProductionDate);
      overdue.setDate(overdue.getDate() + client.termsDays);

      // hold = overdue + 7 days
      hold = new Date(overdue);
      hold.setDate(overdue.getDate() + 7);
    }

    const [result] = await db.query(
      `
      UPDATE client
      SET \`over30\` = ?, \`over60\` = ?, \`over90\` = ?,
          overdue = ?, hold = ?
      WHERE id = ?
      `,
      [aging.over30, aging.over60, aging.over90, overdue, hold, clientId]
    );
  }
}

export default updateClientAging;
