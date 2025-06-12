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
    if (!clientId || !productionDate) continue;

    const grand = parseFloat(grandTotal);
    const paid = parseFloat(amountPaid || 0);

    if (isNaN(grand) || isNaN(paid)) {
      console.warn(
        `Skipping NaN order: orderId=${orderId}, clientId=${clientId}, grandTotal=${grandTotal}, amountPaid=${amountPaid}`
      );
      continue;
    }

    const balance = grand - paid;
    if (balance <= 0) continue;

    const prodDate = new Date(productionDate);
    const days = Math.floor((now - prodDate) / (1000 * 60 * 60 * 24));

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

  if (agingMap.size === 0) return;

  // Update each client with their aging values + warning/hold dates
  for (const [clientId, aging] of agingMap.entries()) {
    const [clientRows] = await db.query(
      `SELECT c.overdue, c.hold, c.terms, pt.days as termsDays
       FROM client c
       LEFT JOIN paymentTerms pt ON c.terms = pt.terms
       WHERE c.id = ?`,
      [clientId]
    );
    const client = clientRows[0] || {};

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

    if (oldestProductionDate && client.termsDays != null) {
      overdue = new Date(oldestProductionDate);
      overdue.setDate(overdue.getDate() + client.termsDays);

      hold = new Date(overdue);
      hold.setDate(hold.getDate() + 7);
    }

    const aging31_60 = isNaN(aging.over30) ? 0 : aging.over30;
    const aging61_90 = isNaN(aging.over60) ? 0 : aging.over60;
    const agingOver90 = isNaN(aging.over90) ? 0 : aging.over90;

    await db.query(
      `
      UPDATE client
      SET \`over30\` = ?, \`over60\` = ?, \`over90\` = ?,
          overdue = ?, hold = ?
      WHERE id = ?
      `,
      [aging31_60, aging61_90, agingOver90, overdue, hold, clientId]
    );
  }
}

export default updateClientAging;
