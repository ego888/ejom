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

  for (const [clientId, aging] of agingMap.entries()) {
    const [clientRows] = await db.query(
      `SELECT warningDate, holdDate FROM client WHERE id = ?`,
      [clientId]
    );
    const client = clientRows[0] || {};

    let warningDate = client.warningDate;
    let holdDate = client.holdDate;

    const overdue = aging["61-90"] > 0 || aging.moreThan90 > 0;

    if (overdue) {
      if (!client.warningDate) warningDate = now;
      if (!client.holdDate) {
        holdDate = new Date();
        holdDate.setDate(now.getDate() + 7);
      }

      console.log(`Updating client ${clientId} with:`);
      console.log(`  31-60: ${aging["31-60"]}`);
      console.log(`  61-90: ${aging["61-90"]}`);
      console.log(`  >90  : ${aging.moreThan90}`);
      console.log(`  warningDate: ${warningDate}`);
      console.log(`  holdDate   : ${holdDate}`);
    } else {
      warningDate = null;
      holdDate = null;
    }

    const [result] = await db.query(
      `
      UPDATE client
      SET \`31-60\` = ?, \`61-90\` = ?, \`moreThan90\` = ?,
          warningDate = ?, holdDate = ?
      WHERE id = ?
    `,
      [
        aging["31-60"],
        aging["61-90"],
        aging.moreThan90,
        overdue ? warningDate : null,
        overdue ? holdDate : null,
        clientId,
      ]
    );
  }

  console.log(`[${new Date().toISOString()}] ✅ Client aging update complete`);
}

export default updateClientAging;
