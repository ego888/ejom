import db from "../utils/db.js";

async function updateClientAging() {
  const now = new Date();

  const [orders] = await db.query(`
    SELECT orderId, clientId, grandTotal, amountPaid, productionDate
    FROM orders
    WHERE status IN ('Delivered', 'Billed')
  `);

  console.log(`Total delivered & billed orders: ${orders.length}`);

  const agingMap = new Map();

  // Group orders by client and bucket them by age
  for (const order of orders) {
    const { orderId, clientId, grandTotal, amountPaid, productionDate } = order;
    if (!clientId || !productionDate) {
      console.log(
        `Skipping order ${orderId}: missing clientId or productionDate`
      );
      continue;
    }

    const prodDate = new Date(productionDate);
    const days = Math.floor((now - prodDate) / (1000 * 60 * 60 * 24));
    const balance = parseFloat(grandTotal) - parseFloat(amountPaid || 0);

    if (balance <= 0) {
      continue;
    }

    if (!agingMap.has(clientId)) {
      agingMap.set(clientId, { "31-60": 0, "61-90": 0, moreThan90: 0 });
    }

    const clientAging = agingMap.get(clientId);

    if (days >= 31 && days <= 60) {
      clientAging["31-60"] += balance;
    } else if (days >= 61 && days <= 90) {
      clientAging["61-90"] += balance;
    } else if (days > 90) {
      clientAging.moreThan90 += balance;
    }

    console.log(
      `Order ${orderId} → client ${clientId} → ${days} days → balance: ${balance}`
    );
  }

  if (agingMap.size === 0) {
    console.log("❌ No aging data to update.");
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

    console.log(`Updating client ${clientId} with:`);
    console.log(`  31-60: ${aging["31-60"]}`);
    console.log(`  61-90: ${aging["61-90"]}`);
    console.log(`  >90  : ${aging.moreThan90}`);
    console.log(`  overdue: ${overdue}`);
    console.log(`  hold   : ${hold}`);

    const [result] = await db.query(
      `
      UPDATE client
      SET \`31-60\` = ?, \`61-90\` = ?, \`moreThan90\` = ?,
          overdue = ?, hold = ?
      WHERE id = ?
      `,
      [
        aging["31-60"],
        aging["61-90"],
        aging.moreThan90,
        overdue,
        hold,
        clientId,
      ]
    );

    console.log(
      `→ Client ${clientId} updated. Rows affected: ${result.affectedRows}`
    );
  }

  console.log(`[${new Date().toISOString()}] ✅ Client aging update complete`);
}

export default updateClientAging;
